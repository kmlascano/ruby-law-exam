// TODO: implement the main page
// It should:
// 1. Render the <UploadForm /> component
// 2. On successful upload, render the <AnalysisResults /> component
// 3. Show a loading indicator while the analysis is in progress
// 4. Show an error message if the upload or analysis fails

import type { ReactElement } from 'react';

export function ContractUploadPage(): ReactElement {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <h1>Contract Analysis</h1>
      {/* TODO: add UploadForm and AnalysisResults components */}
      <p>Your implementation goes here.</p>
    </main>
  );
}
