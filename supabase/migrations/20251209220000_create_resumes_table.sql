
-- Migration: Create resumes table for storing resume previews
-- Description: Stores HTML/Markdown resume previews with PDF generation status

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES vagas_estagio(id) ON DELETE CASCADE,
  language VARCHAR(2) NOT NULL CHECK (language IN ('pt', 'en')),
  html_content TEXT,
  markdown_content TEXT,
  pdf_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'preview_saved' CHECK (status IN ('preview_saved', 'pdf_generated')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, language)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resumes_job_id ON resumes(job_id);
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);
CREATE INDEX IF NOT EXISTS idx_resumes_language ON resumes(language);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resumes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resumes_updated_at
BEFORE UPDATE ON resumes
FOR EACH ROW
EXECUTE FUNCTION update_resumes_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now, can be restricted later)
CREATE POLICY "Allow all operations on resumes"
ON resumes
FOR ALL
USING (true)
WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE resumes IS 'Stores resume previews (HTML/Markdown) and generated PDFs for job applications';
COMMENT ON COLUMN resumes.job_id IS 'Foreign key to vagas_estagio table';
COMMENT ON COLUMN resumes.language IS 'Resume language: pt (Portuguese) or en (English)';
COMMENT ON COLUMN resumes.html_content IS 'HTML content of the resume (optional, for backward compatibility)';
COMMENT ON COLUMN resumes.markdown_content IS 'Markdown content of the resume (primary storage format)';
COMMENT ON COLUMN resumes.pdf_url IS 'Data URL or external URL of the generated PDF';
COMMENT ON COLUMN resumes.status IS 'Resume status: preview_saved (only markdown/html saved) or pdf_generated (PDF generated)';
