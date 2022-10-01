importScripts('./libs/idb-keyval.umd.js');
importScripts('./libs/dayjs.min.js');

importScripts('./libs/exceljs.min.js');
importScripts('./libs/jspdf.umd.min.js');

importScripts('./utils/utils.js');
importScripts('./utils/utils.export.js');
importScripts('./utils/utils.budget.js');
importScripts('./utils/utils.excel.js');
importScripts('./utils/utils.pdf.js');

self.onmessage = async ($event) => {
  if ($event && $event.data && $event.data.msg === 'export') {
    await self.export(
      $event.data.invoices,
      $event.data.projectId,
      $event.data.currency,
      $event.data.vat,
      $event.data.bill,
      $event.data.client,
      $event.data.i18n,
      $event.data.type,
      $event.data.signature
    );
  }
};

self.export = async (
  invoices,
  filterProjectId,
  currency,
  vat,
  bill,
  client,
  i18n,
  type,
  signature
) => {
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

  const results = await self.exportInvoices(
    invoices,
    projects,
    filterProjectId,
    currency,
    vat,
    client,
    i18n,
    type,
    signature
  );

  await updateBudget(results.invoices, filterProjectId, bill);

  // We set all invoices as billed regardless if they contain or not tasks
  await self.billInvoices(invoices, filterProjectId, bill);

  self.postMessage(results.excel);
};

async function exportInvoices(
  invoices,
  projects,
  filterProjectId,
  currency,
  vat,
  client,
  i18n,
  type,
  signature
) {
  const promises = [];

  invoices.forEach((invoice) => {
    promises.push(exportInvoice(invoice, projects, filterProjectId));
  });

  const allInvoices = await Promise.all(promises);

  if (!allInvoices || allInvoices.length <= 0) {
    return {
      excel: undefined,
      invoices: undefined,
    };
  }

  const filteredInvoices = allInvoices.filter((tasks) => {
    return tasks && tasks !== undefined && tasks.length > 0;
  });

  if (!filteredInvoices || filteredInvoices.length <= 0) {
    return {
      excel: undefined,
      invoices: undefined,
    };
  }

  const concatenedInvoices = filteredInvoices.reduce((a, b) => a.concat(b), []);

  const results =
    type === 'pdf'
      ? await exportToPdf(concatenedInvoices, client, currency, vat, i18n, signature)
      : await exportToExcel(concatenedInvoices, client, currency, vat, i18n, signature);

  return {
    excel: results,
    invoices: concatenedInvoices,
  };
}

async function billInvoices(invoices, filterProjectId, bill) {
  const promises = [];

  invoices.forEach((invoice) => {
    promises.push(billInvoice(invoice, filterProjectId, bill));
  });

  await Promise.all(promises);
}

function exportInvoice(invoice, projects, filterProjectId) {
  return new Promise(async (resolve) => {
    const tasks = await idbKeyval.get(`tasks-${invoice}`);

    if (!tasks || tasks.length <= 0) {
      resolve(undefined);
      return;
    }

    // Only the tasks which are still not billed and which has to do with the selected project
    let filteredTasks = tasks.filter((task) => {
      return task.data.invoice.status === 'open' && task.data.project_id === filterProjectId;
    });

    if (!filteredTasks || filteredTasks.length <= 0) {
      resolve(undefined);
      return;
    }

    const results = convertTasks(filteredTasks, projects, undefined, false);

    if (!results || results.length <= 0) {
      resolve(undefined);
      return;
    }

    resolve(results);
  });
}

function billInvoice(invoice, filterProjectId, bill) {
  return new Promise(async (resolve) => {
    if (!bill) {
      resolve();
      return;
    }

    const tasks = await idbKeyval.get(`tasks-${invoice}`);

    if (!tasks || tasks.length <= 0) {
      resolve();
      return;
    }

    tasks.forEach((task) => {
      if (task.data.invoice.status === 'open' && task.data.project_id === filterProjectId) {
        task.data.invoice.status = 'billed';
        task.data.updated_at = new Date().getTime();
      }
    });

    await idbKeyval.set(`tasks-${invoice}`, tasks);

    resolve();
  });
}
