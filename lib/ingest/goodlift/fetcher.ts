const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class GoodliftFetcher {
  private lastRequestAt = 0;
  constructor(private minIntervalMs = 1000) {}

  private async waitForSlot() {
    const since = Date.now() - this.lastRequestAt;
    if (since < this.minIntervalMs) {
      await sleep(this.minIntervalMs - since);
    }
    this.lastRequestAt = Date.now();
  }

  async fetchHtml(url: string): Promise<string> {
    await this.waitForSlot();
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html',
      },
    });
    if (!res.ok) {
      throw new Error(`GoodLift fetch ${url} → HTTP ${res.status}`);
    }
    return res.text();
  }

  async fetchCompetitionsListing(year: number): Promise<string> {
    return this.fetchHtml(`https://goodlift.info/competitions.php?year=${year}`);
  }

  async fetchCompetitionDetail(cid: number): Promise<string> {
    return this.fetchHtml(`https://goodlift.info/onecompetition_dtl.php?lid=0&cid=${cid}`);
  }
}
