import io
import re
import csv
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import dateutil.parser

logger = logging.getLogger("calendar_ingestion")

# Standard Column Alias Mappings
COLUMN_ALIASES = {
    "date": ["date", "publish date", "scheduled date", "scheduled time", "time", "slot", "timestamp", "when", "datetime", "post date", "send date"],
    "channel": ["channel", "platform", "network", "destination", "type", "social platform", "medium"],
    "content": ["content", "copy", "post text", "body", "message", "script", "post copy", "email body", "caption", "text"],
    "title": ["title", "headline", "topic", "hook", "name", "campaign title", "event title", "subject line", "subject"],
    "cta": ["cta", "call to action", "link", "action", "url", "button", "target link"]
}

VALID_CHANNELS = {
    "linkedin": ["linkedin", "li", "linked-in", "linkedin post"],
    "x": ["x", "twitter", "tweet", "x post", "tweet thread"],
    "instagram": ["instagram", "ig", "insta", "instagram post", "reel caption"],
    "email": ["email", "mail", "newsletter", "email campaign", "marketing email", "broadcast"],
    "video": ["video", "short", "reels", "tiktok", "storyboard", "video script"]
}

def normalize_channel(raw_channel: str) -> Optional[str]:
    if not raw_channel:
        return "linkedin"
    clean = str(raw_channel).strip().lower()
    for canonical, aliases in VALID_CHANNELS.items():
        if clean == canonical or clean in aliases:
            return canonical
        for a in aliases:
            if a in clean:
                return canonical
    return None

def detect_column_mappings(headers: List[str]) -> Dict[str, str]:
    detected = {}
    normalized_headers = [re.sub(r'[^a-z0-9]', ' ', str(h).strip().lower()) for h in headers]
    
    for canon_field, aliases in COLUMN_ALIASES.items():
        for idx, norm_h in enumerate(normalized_headers):
            if any(alias == norm_h or norm_h.startswith(alias) or alias in norm_h for alias in aliases):
                if canon_field not in detected:
                    detected[canon_field] = headers[idx]
                    break
    return detected

def parse_and_validate_datetime(raw_val: str, timezone_str: str = "Asia/Kolkata") -> Tuple[Optional[str], Optional[str]]:
    """Returns (iso_utc_string, error_message)"""
    if not raw_val or not str(raw_val).strip():
        return None, "Date/time is missing"
    
    val_str = str(raw_val).strip()
    try:
        dt = dateutil.parser.parse(val_str, fuzzy=True)
        # Format as standard ISO 8601
        return dt.isoformat(), None
    except Exception as e:
        return None, f"Invalid date format '{val_str}': {str(e)}"

def parse_tabular_data(content_bytes: bytes, filename: str, timezone_str: str = "Asia/Kolkata") -> Dict[str, Any]:
    """
    Tier 1 parser for CSV, TSV, and Excel files (.xlsx).
    Returns normalized IngestParseResponse dict with detected columns and row validations.
    """
    rows_data = []
    headers = []
    
    if filename.endswith(".csv") or filename.endswith(".tsv"):
        delimiter = "\t" if filename.endswith(".tsv") else ","
        try:
            text = content_bytes.decode("utf-8-sig")
        except Exception:
            text = content_bytes.decode("latin-1")
        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        raw_rows = [r for r in reader if any(field.strip() for field in r)]
        if raw_rows:
            headers = [h.strip() for h in raw_rows[0]]
            for r in raw_rows[1:]:
                row_dict = {}
                for idx, h in enumerate(headers):
                    row_dict[h] = r[idx] if idx < len(r) else ""
                rows_data.append(row_dict)
    elif filename.endswith(".xlsx"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            ws = wb.active
            iter_rows = list(ws.iter_rows(values_only=True))
            if iter_rows:
                headers = [str(h).strip() if h is not None else f"Column_{i}" for i, h in enumerate(iter_rows[0])]
                for r in iter_rows[1:]:
                    if any(cell is not None and str(cell).strip() for cell in r):
                        row_dict = {}
                        for idx, h in enumerate(headers):
                            val = r[idx] if idx < len(r) else ""
                            row_dict[h] = str(val).strip() if val is not None else ""
                        rows_data.append(row_dict)
        except Exception as e:
            logger.error(f"Failed openpyxl parsing: {e}")
            raise ValueError(f"Could not parse Excel spreadsheet: {str(e)}")
            
    if not headers:
        raise ValueError("Spreadsheet has no headers or data rows.")
        
    mappings = detect_column_mappings(headers)
    
    # Process and validate each row
    validated_rows = []
    valid_count = 0
    error_count = 0
    
    for idx, r in enumerate(rows_data):
        row_num = idx + 2 # accounting for header line
        errors = []
        warnings = []
        
        # Extract fields based on mapping or fallback
        raw_date = r.get(mappings.get("date", ""), "")
        raw_channel = r.get(mappings.get("channel", ""), "")
        raw_content = r.get(mappings.get("content", ""), "")
        raw_title = r.get(mappings.get("title", ""), "")
        raw_cta = r.get(mappings.get("cta", ""), "")
        
        # Channel Validation
        norm_ch = normalize_channel(raw_channel)
        if not norm_ch:
            if raw_channel:
                errors.append(f"Unrecognized channel '{raw_channel}'. Must map to linkedin, x, instagram, email, or video.")
            else:
                norm_ch = "linkedin"
                warnings.append("Channel was unspecified; defaulted to LinkedIn.")
        
        # Datetime Validation
        iso_dt, date_err = parse_and_validate_datetime(raw_date, timezone_str)
        if date_err:
            errors.append(date_err)
            iso_dt = datetime.utcnow().isoformat()
            
        # Content Validation
        if not raw_content and not raw_title:
            errors.append("Row is missing copy/content.")
            
        title_val = raw_title or (raw_content[:50] + "..." if len(raw_content) > 50 else raw_content) or f"Scheduled {norm_ch.upper()} Post"
        
        status = "error" if errors else ("warning" if warnings else "valid")
        if status == "error":
            error_count += 1
        else:
            valid_count += 1
            
        validated_rows.append({
            "row_number": row_num,
            "title": title_val,
            "channel": norm_ch or "linkedin",
            "scheduled_at": iso_dt,
            "timezone": timezone_str,
            "content_text": raw_content,
            "subject": raw_title if norm_ch == "email" else None,
            "cta": raw_cta,
            "status": status,
            "errors": errors,
            "warnings": warnings
        })
        
    return {
        "filename": filename,
        "total_rows": len(validated_rows),
        "valid_rows_count": valid_count,
        "error_rows_count": error_count,
        "detected_columns": mappings,
        "rows": validated_rows
    }

def parse_document_data(content_bytes: bytes, filename: str, timezone_str: str = "Asia/Kolkata") -> Dict[str, Any]:
    """
    Tier 2 parser for DOCX, PDF, and Plaintext / Markdown documents.
    Extracts text blocks, date references, and tables into reviewable schedule rows.
    """
    extracted_text = ""
    
    if filename.endswith(".txt") or filename.endswith(".md"):
        try:
            extracted_text = content_bytes.decode("utf-8")
        except Exception:
            extracted_text = content_bytes.decode("latin-1")
    elif filename.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(content_bytes))
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            tables_text = []
            for t in doc.tables:
                for row in t.rows:
                    tables_text.append(" | ".join(cell.text.strip() for cell in row.cells))
            extracted_text = "\n".join(paras + tables_text)
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            extracted_text = str(content_bytes, errors="ignore")
    elif filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
            extracted_text = "\n".join(pages_text)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            extracted_text = str(content_bytes, errors="ignore")
            
    # Parse text into paragraphs / distinct schedule entries
    lines = [line.strip() for line in extracted_text.split("\n") if len(line.strip()) > 10]
    
    validated_rows = []
    valid_count = 0
    error_count = 0
    
    for idx, line in enumerate(lines[:30]): # max 30 slots extracted
        row_num = idx + 1
        errors = []
        warnings = []
        
        # Check channel mentions in text
        detected_ch = "linkedin"
        for ch, aliases in VALID_CHANNELS.items():
            if any(re.search(rf"\b{re.escape(a)}\b", line, re.I) for a in aliases):
                detected_ch = ch
                break
                
        # Try extracting a date
        date_match = re.search(r'(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?\b)', line, re.I)
        raw_date = date_match.group(0) if date_match else None
        
        if raw_date:
            iso_dt, date_err = parse_and_validate_datetime(raw_date, timezone_str)
            if date_err:
                warnings.append(f"Date parsed with fallback: {date_err}")
                iso_dt = datetime.utcnow().isoformat()
        else:
            iso_dt = datetime.utcnow().isoformat()
            warnings.append("No explicit date identified in line; assigned current time.")
            
        title = line[:60] + "..." if len(line) > 60 else line
        
        status = "warning" if warnings else "valid"
        valid_count += 1
        
        validated_rows.append({
            "row_number": row_num,
            "title": f"{detected_ch.upper()} Post: {title}",
            "channel": detected_ch,
            "scheduled_at": iso_dt,
            "timezone": timezone_str,
            "content_text": line,
            "subject": title if detected_ch == "email" else None,
            "cta": "Learn more",
            "status": status,
            "errors": errors,
            "warnings": warnings
        })
        
    return {
        "filename": filename,
        "total_rows": len(validated_rows),
        "valid_rows_count": valid_count,
        "error_rows_count": error_count,
        "detected_columns": {"document_text": "Extracted Paragraphs"},
        "rows": validated_rows
    }
