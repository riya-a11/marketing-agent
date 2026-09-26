import os
import sys
import yaml
import logging

logger = logging.getLogger("codegen_pydantic")
logging.basicConfig(level=logging.INFO)

OPENAPI_SPEC_PATH = os.environ.get(
    "OPENAPI_SPEC_PATH",
    r"C:\Users\HP\.gemini\antigravity\brain\a391edaf-c574-4c7c-83b8-3dbc61530720\openapi_v1.0_final.yaml"
)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "schemas", "generated")

def generate_pydantic_models():
    """
    Parses openapi_v1.0_final.yaml and generates Pydantic DTO schemas.
    """
    if not os.path.exists(OPENAPI_SPEC_PATH):
        logger.warning(f"OpenAPI spec not found at {OPENAPI_SPEC_PATH}. Generating fallback schemas module.")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        init_path = os.path.join(OUTPUT_DIR, "__init__.py")
        with open(init_path, "w", encoding="utf-8") as f:
            f.write("# Generated Pydantic DTO Schemas from OpenAPI 3.1.0\n")
        return

    with open(OPENAPI_SPEC_PATH, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    schemas = spec.get("components", {}).get("schemas", {})
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    output_file = os.path.join(OUTPUT_DIR, "models.py")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("# Auto-generated Pydantic models from openapi_v1.0_final.yaml\n")
        f.write("from pydantic import BaseModel, Field\n")
        f.write("from typing import Optional, List, Any, Dict\n\n")
        
        for name, schema in schemas.items():
            f.write(f"class {name}(BaseModel):\n")
            props = schema.get("properties", {})
            if not props:
                f.write("    pass\n\n")
                continue
            required = schema.get("required", [])
            for prop_name, prop_spec in props.items():
                prop_type = "Any"
                t = prop_spec.get("type")
                if t == "string":
                    prop_type = "str"
                elif t == "integer":
                    prop_type = "int"
                elif t == "number":
                    prop_type = "float"
                elif t == "boolean":
                    prop_type = "bool"
                elif t == "array":
                    prop_type = "List[Any]"
                elif t == "object":
                    prop_type = "Dict[str, Any]"

                if prop_name in required:
                    f.write(f"    {prop_name}: {prop_type}\n")
                else:
                    f.write(f"    {prop_name}: Optional[{prop_type}] = None\n")
            f.write("\n")

    init_path = os.path.join(OUTPUT_DIR, "__init__.py")
    with open(init_path, "w", encoding="utf-8") as f:
        f.write("from app.schemas.generated.models import *\n")

    logger.info(f"Successfully generated {len(schemas)} Pydantic schemas in {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_pydantic_models()
