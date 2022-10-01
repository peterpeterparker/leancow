import {format} from 'date-fns';

import i18next from 'i18next';

import {interval} from '../../utils/utils.date';
import {exportLabels} from '../../utils/utils.export';
import {
  download,
  getMobileDir,
  getNewFileHandle,
  shareMobile,
  writeFile,
} from '../../utils/utils.filesystem';

import {Invoice} from '../../store/interfaces/invoice';

import {DirectoryEntry, File, IWriteOptions} from '@awesome-cordova-plugins/file';

import {Currency} from '../../definitions/currency';

export class ExportService {
  private static instance: ExportService;

  private exportWorker: Worker = new Worker('./workers/export.js');

  private constructor() {
    // Private constructor, singleton
  }

  static getInstance() {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  exportNativeFileSystem(
    invoice: Invoice,
    from: Date | undefined,
    to: Date | undefined,
    currency: Currency,
    vat: number | undefined,
    bill: boolean,
    type: 'xlsx' | 'pdf',
    signature: string | undefined
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (invoice === undefined || invoice.project_id === undefined) {
        reject('No invoice data.');
        return;
      }

      const invoices: string[] | undefined = interval(from, to);

      if (invoices === undefined) {
        reject('No invoices to export.');
        return;
      }

      try {
        const fileHandle: FileSystemFileHandle = await getNewFileHandle(type);

        if (!fileHandle) {
          reject('Cannot access filesystem.');
          return;
        }

        this.exportWorker.onmessage = async ($event: MessageEvent) => {
          if ($event && $event.data) {
            await writeFile(fileHandle, $event.data);
          }
        };

        await this.postMessage(invoice, invoices, currency, vat, bill, type, signature);

        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }

  exportDownload(
    invoice: Invoice,
    from: Date | undefined,
    to: Date | undefined,
    currency: Currency,
    vat: number | undefined,
    bill: boolean,
    type: 'xlsx' | 'pdf',
    signature: string | undefined
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (invoice === undefined || invoice.project_id === undefined) {
        reject('No invoice data.');
        return;
      }

      const invoices: string[] | undefined = interval(from, to);

      if (invoices === undefined) {
        reject('No invoices to export.');
        return;
      }

      try {
        const filename: string = this.filename(invoice, from, to, type);

        this.exportWorker.onmessage = async ($event: MessageEvent) => {
          if ($event && $event.data) {
            download(filename, $event.data);
          }
        };

        await this.postMessage(invoice, invoices, currency, vat, bill, type, signature);

        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }

  exportMobileFileSystem(
    invoice: Invoice,
    from: Date | undefined,
    to: Date | undefined,
    currency: Currency,
    vat: number | undefined,
    bill: boolean,
    type: 'xlsx' | 'pdf',
    signature: string | undefined
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (invoice === undefined || invoice.project_id === undefined) {
        reject('No invoice data.');
        return;
      }

      const invoices: string[] | undefined = interval(from, to);

      if (invoices === undefined) {
        reject('No invoices to export.');
        return;
      }

      try {
        const filename: string = this.filename(invoice, from, to, type);

        this.exportWorker.onmessage = async ($event: MessageEvent) => {
          if ($event && $event.data) {
            const dir: DirectoryEntry = await getMobileDir();

            const writeOptions: IWriteOptions = {
              replace: true,
              append: false,
            };

            await File.writeFile(dir.nativeURL, filename, $event.data, writeOptions);

            await shareMobile(this.shareSubject(invoice), dir.nativeURL, filename);
          }
        };

        await this.postMessage(invoice, invoices, currency, vat, bill, type, signature);

        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }

  private shareSubject(invoice: Invoice): string {
    return `Tie Tracker${invoice.client && invoice.client.name ? ` - ${invoice.client.name}` : ''}`;
  }

  private filename(
    invoice: Invoice,
    from: Date | undefined,
    to: Date | undefined,
    type: 'xlsx' | 'pdf'
  ): string {
    const name: string = invoice.client && invoice.client.name ? invoice.client.name : 'export';
    return `${name}${from ? '-' + format(from, 'yyyy-MM-dd') : ''}${
      to ? '-' + format(to, 'yyyy-MM-dd') : ''
    }.${type}`;
  }

  private async postMessage(
    invoice: Invoice,
    invoices: string[],
    currency: Currency,
    vat: number | undefined,
    bill: boolean,
    type: 'xlsx' | 'pdf',
    signature: string | undefined
  ) {
    await i18next.loadNamespaces('export');

    this.exportWorker.postMessage({
      msg: 'export',
      invoices: invoices,
      projectId: invoice.project_id,
      client: invoice.client,
      currency: currency,
      vat: vat,
      bill: bill,
      i18n: exportLabels(),
      type,
      signature,
    });
  }
}
