import {
  Browser,
  BrowserContext,
  chromium,
  Page,
  type Download,
} from "playwright";
import path from "node:path";
import fs from "node:fs";
import { Config } from "../config/config.js";
import { log } from "../logger.js";
import { DownloadError, LoginError, TransientError } from "../error.js";
import { uploadArtifact } from "./artifact.services.js";

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

export class ZaloPayPortal {
  private browser: Browser | null = null;
  private ctx: BrowserContext | null = null;
  private _page: Page | null = null;

  constructor(private readonly cfg: Config) {}
  private get page(): Page {
    if (!this._page)
      throw new Error("Portal chưa được mở, hãy gọi open() trước");
    return this._page;
  }

  async open(): Promise<this> {
    this.browser = await chromium.launch({
      headless: this.cfg.ZP_HEADLESS,
      args: ["--no-sandbox"],
    });
    this.ctx = await this.browser.newContext({
      acceptDownloads: true,
      locale: "vi-VN",
      timezoneId: "Asia/Ho_Chi_Minh",
    });
    this.ctx.setDefaultTimeout(this.cfg.ZP_TIMEOUT_MS);
    this._page = await this.ctx.newPage();

    this._page.on("response", (r) => {
      if (r.status() >= 400) this.note(`${r.status()} ${this.pathOf(r.url())}`);
    });
    this._page.on("requestfailed", (r) =>
      this.note(
        `FAILED ${this.pathOf(r.url())} ${r.failure()?.errorText ?? ""}`,
      ),
    );
    this._page.on("pageerror", (e) =>
      this.note(`pageerror: ${e.message.slice(0, 120)}`),
    );
    this.ctx.on("page", () => this.note("trang/popup mới được mở"));
    return this;
  }
  async close(err?: unknown): Promise<void> {
    try {
      if (err && this._page) {
        const file = path.join(this.cfg.artifactsDir, `fail-${Date.now()}.png`);
        await this._page.screenshot({ path: file, fullPage: true });
        // await uploadArtifact(file);
        log.error("Screenshot saved", { file });
      }
    } catch (e) {
      log.error("Screenshot is not saved", { reason: errMsg(e) });
    } finally {
      await this.ctx?.close().catch(() => {});
      await this.browser?.close().catch(() => {});
    }
  }

  async login(): Promise<void> {
    const { page, cfg } = this;
    log.info("Start login");
    try {
      await page.goto(cfg.ZP_PORTAL_URL, { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "Truy cập Merchant Tool" }).click();
      await page
        .getByRole("textbox", { name: "Số điện thoại" })
        .fill(cfg.ZP_USERNAME);
      await page
        .getByRole("textbox", { name: "Mật khẩu" })
        .fill(cfg.ZP_PASSWORD);
      await page.getByRole("button", { name: "Đăng nhập" }).click();
    } catch (e) {
      throw new TransientError(`Error when login :${errMsg(e)}`, { cause: e });
    }

    try {
      await page.getByText("TỔNG SỐ GD").first().waitFor({ timeout: 20_000 });
    } catch (e) {
      throw new LoginError("Login error", { cause: e });
    }

    log.info("Login successfully");
  }

  async downloadTransactions(): Promise<string> {
    const { page, cfg } = this;
    log.info("Start download file excel");
    let target = "";
    try {
      await page.getByText("TỔNG SỐ GD").first().click();

      const form = page.getByRole("form", { name: "Form Search" });
      if (cfg.ZP_APP_NAME) {
        await form.getByText("Chọn App").click();
        await form.getByText(cfg.ZP_APP_NAME).click();
      }
      await form.waitFor();
      await page.getByRole("button", { name: "Tìm Kiếm" }).click();

      const exportBtn = page.getByRole("button", { name: "export type" });
      let download: Download | undefined;
      for (let attempt = 1; attempt <= 3 && !download; attempt++) {
        try {
          [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 30_000 }),
            exportBtn.click(),
          ]);
        } catch (e) {
          const reason =
            e instanceof Error ? e.message.split("\n")[0] : String(e);
          log.warn("Bấm xuất chưa nhận được file, thử lại", {
            attempt,
            reason,
          });
          if (attempt === 3) throw e;
          await page.waitForTimeout(3000);
        }
      }
      if (!download) throw new Error("Không nhận được file tải về");

      target = path.join(
        cfg.downloadDir,
        `tx-${Date.now()}-${download.suggestedFilename()}`,
      );
      await download.saveAs(target);
    } catch (e) {
      log.error(
        "Trạng thái trang lúc xuất file thất bại",
        await this.pageState(),
      );
      throw new DownloadError(`Download file failed:${errMsg(e)} `, {
        cause: e,
      });
    }

    const size = fs.statSync(target).size;
    if (size === 0) throw new DownloadError("File tải về bị rỗng");
    log.info("Đã tải file", { file: path.basename(target), bytes: size });
    return target;
  }

  private async pageState(): Promise<Record<string, unknown>> {
    try {
      const page = this.page;
      const exportBtn = page.getByRole("button", { name: "export type" });
      return {
        url: page.url(),
        title: await page.title(),
        exportVisible: await exportBtn.isVisible(),
        exportEnabled: await exportBtn.isEnabled(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        timezone: await page.evaluate(
          () => Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
        recentEvents: this.net
      };
    } catch (e) {
      return { stateError: e instanceof Error ? e.message : String(e) };
    }
  }
  private net: string[] = [];

  private note(s: string): void {
    if (this.net.length >= 30) this.net.shift();
    this.net.push(s);
  }


  private pathOf(url: string): string {
    try {
      const u = new URL(url);
      return u.protocol.startsWith("http") ? u.pathname : u.protocol;
    } catch {
      return "?";
    }
  }
}

export async function withPortal<T>(
  cfg: Config,
  fn: (portal: ZaloPayPortal) => Promise<T>,
): Promise<T> {
  const portal = await new ZaloPayPortal(cfg).open();
  try {
    const result = await fn(portal);
    await portal.close();
    return result;
  } catch (err) {
    await portal.close(err);
    throw err;
  }
}
