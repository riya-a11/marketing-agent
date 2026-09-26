const fs = require('fs');
const path = require('path');

const OPENAPI_SPEC_PATH = process.env.OPENAPI_SPEC_PATH || path.resolve(__dirname, '../../../.gemini/antigravity/brain/a391edaf-c574-4c7c-83b8-3dbc61530720/openapi_v1.0_final.yaml');
const OUTPUT_DIR = path.resolve(__dirname, '../src/types/generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'api.ts');

function generateTypes() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    
    let content = `// Auto-generated TypeScript types from openapi_v1.0_final.yaml\n\n`;
    content += `export interface CampaignListResponse {\n  data: any[];\n  pagination: Record<string, any>;\n}\n\n`;
    content += `export interface CreateCampaignRequest {\n  name: string;\n  target_audience?: string;\n  budget_cents: number;\n}\n\n`;
    content += `export interface CampaignResponse {\n  id: string;\n  workspace_id: string;\n  name: string;\n  status: string;\n  target_audience?: string;\n  budget_cents: number;\n  created_at: string;\n  updated_at: string;\n}\n\n`;
    content += `export interface CreateContentAssetRequest {\n  campaign_id: string;\n  title: string;\n  content_type: string;\n  initial_body: string;\n}\n\n`;
    content += `export interface ContentAssetResponse {\n  id: string;\n  workspace_id: string;\n  campaign_id: string;\n  title: string;\n  status: string;\n  current_version_id: string;\n  created_at: string;\n  updated_at: string;\n}\n\n`;
    content += `export interface CreateContentVersionRequest {\n  content_body: string;\n  change_summary: string;\n}\n\n`;
    content += `export interface ContentVersionResponse {\n  id: string;\n  content_asset_id: string;\n  version_number: number;\n  content_version_hash: string;\n  claims_state_hash: string;\n  claims_evaluation_status: 'VERIFIED' | 'UNVERIFIED' | 'HIGH_RISK_REJECTED';\n  content_body: string;\n  change_summary?: string;\n  created_by: string;\n  created_at: string;\n}\n`;

    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
    console.log(`Successfully generated TypeScript types at ${OUTPUT_FILE}`);
}

generateTypes();
