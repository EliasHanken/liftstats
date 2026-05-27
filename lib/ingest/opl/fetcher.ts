import { Open } from 'unzipper';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const OPL_ZIP_URL = 'https://openpowerlifting.gitlab.io/opl-csv/files/openpowerlifting-latest.zip';

export async function defaultFetchCsv(): Promise<Readable> {
  const tmpZip = path.join(os.tmpdir(), `opl-${Date.now()}.zip`);

  // Download to disk to avoid holding the 250MB zip in memory.
  const res = await fetch(OPL_ZIP_URL);
  if (!res.ok || !res.body) throw new Error(`OPL fetch failed: ${res.status}`);
  const fileStream = fs.createWriteStream(tmpZip);
  const reader = res.body.getReader();
  await new Promise<void>((resolve, reject) => {
    function pump(): void {
      reader.read().then(({ done, value }) => {
        if (done) { fileStream.end(); resolve(); return; }
        fileStream.write(value, () => pump());
      }).catch(reject);
    }
    pump();
  });

  // Open the zip and locate openpowerlifting.csv. The archive contains a folder
  // like `openpowerlifting-2026-05-27/openpowerlifting.csv` — we don't hardcode
  // the folder name, we find the file by basename.
  const directory = await Open.file(tmpZip);
  const csvFile = directory.files.find((f) => f.path.endsWith('/openpowerlifting.csv'));
  if (!csvFile) throw new Error(`openpowerlifting.csv not found in ${OPL_ZIP_URL}`);

  // unzipper's .stream() returns a node Readable.
  return csvFile.stream() as unknown as Readable;
}
