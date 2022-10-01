importScripts('./libs/idb-keyval.umd.js');
importScripts('./libs/dayjs.min.js');

importScripts('./libs/exceljs.min.js');

importScripts('./libs/jszip.min.js');

importScripts('./utils/utils.js');
importScripts('./utils/utils.export.js');
importScripts('./utils/utils.excel.js');

self.onmessage = async ($event) => {
  if ($event && $event.data && $event.data.msg === 'backup-excel') {
    await self.backupExcel(
      $event.data.currency,
      $event.data.vat,
      $event.data.i18n,
      $event.data.signature
    );
  } else if ($event && $event.data && $event.data.msg === 'backup-idb') {
    await self.backupIdb();
  }
};

self.backupIdb = async () => {
  const entries = await idbKeyval.entries();

  if (!entries || entries.length <= 0) {
    self.postMessage(undefined);
    return;
  }

  const zip = new JSZip();

  entries.forEach((entry) => {
    const blob = new Blob([JSON.stringify(entry[1])], {type: 'application/json'});

    zip.file(`${entry[0]}.json`, blob, {
      base64: true,
    });
  });

  const data = await zip.generateAsync({type: 'blob'});

  self.postMessage(data);
};

self.backupExcel = async (currency, vat, i18n, signature) => {
  const invoices = await idbKeyval.get('invoices');

  if (!invoices || invoices.length <= 0) {
    self.postMessage(undefined);
    return;
  }

  if (!i18n) {
    self.postMessage(undefined);
    return;
  }

  const projects = await loadProjects();

  if (!projects || projects === undefined) {
    self.postMessage(undefined);
    return;
  }

  const clients = await loadClients();

  if (!clients || clients === undefined) {
    self.postMessage(undefined);
    return;
  }

  self.backupInvoices(invoices, projects, clients, currency, vat, i18n, signature);
};

async function backupInvoices(invoices, projects, clients, currency, vat, i18n, signature) {
  const promises = [];

  invoices.forEach((invoice) => {
    promises.push(backupInvoice(invoice, projects, clients));
  });

  const allInvoices = await Promise.all(promises);

  if (!allInvoices || allInvoices.length <= 0) {
    self.postMessage(undefined);
    return;
  }

  const filteredInvoices = allInvoices.filter((tasks) => {
    return tasks && tasks !== undefined && tasks.length > 0;
  });

  if (!filteredInvoices || filteredInvoices.length <= 0) {
    self.postMessage(undefined);
    return;
  }

  const concatenedInvoices = filteredInvoices.reduce((a, b) => a.concat(b), []);

  const results = await backupToExcel(concatenedInvoices, currency, vat, i18n, signature);

  self.postMessage(results);
}

function backupInvoice(invoice, projects, clients) {
  return new Promise(async (resolve) => {
    const tasks = await idbKeyval.get(`tasks-${invoice}`);

    if (!tasks || tasks.length <= 0) {
      resolve(undefined);
      return;
    }

    // Only the tasks which are still not billed
    const filteredTasks = tasks.filter((task) => {
      return task.data.invoice.status === 'open';
    });

    if (!filteredTasks || filteredTasks.length <= 0) {
      resolve(undefined);
      return;
    }

    const results = convertTasks(filteredTasks, projects, clients, true);

    if (!results || results.length <= 0) {
      resolve(undefined);
      return;
    }

    resolve(results);
  });
}
