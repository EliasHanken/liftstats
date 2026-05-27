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

  // Open the zip and locate the data CSV. The archive structure is:
  //   openpowerlifting-YYYY-MM-DD/openpowerlifting-YYYY-MM-DD-<hash>.csv
  //   openpowerlifting-YYYY-MM-DD/LICENSE.txt
  //   openpowerlifting-YYYY-MM-DD/README.txt
  // The CSV filename includes both the date and a short git hash, so we match by
  // suffix + the "openpowerlifting-" prefix to avoid LICENSE/README.
  const directory = await Open.file(tmpZip);
  const csvFile = directory.files.find((f) =>
    f.path.endsWith('.csv') && f.path.includes('openpowerlifting-'),
  );
  if (!csvFile) throw new Error(`openpowerlifting CSV not found in ${OPL_ZIP_URL}`);

  // unzipper's .stream() returns a node Readable.
  return csvFile.stream() as unknown as Readable;
}
