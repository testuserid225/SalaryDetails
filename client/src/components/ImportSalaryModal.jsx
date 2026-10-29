import React, { useState } from 'react';
import Modal from './Modal';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const sampleCsvHeader = 'Month,Amount,Created,Salary,PT,PF Amount,ESIC,Difference Per Month Amount,Working Day\'s,Per day Salary,Leave Deduction Amount,Leave Taken,Remark,Company';
const sampleCsvRow = '10,95333.33,2024-10-31,100000,200,1800,0,0,30,3333.33,2666.67,0.8,October salary credited,Apex Technologies';

const ImportSalaryModal = ({ isOpen, onClose, onImportSuccess }) => {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const downloadSampleTemplate = () => {
    const csvContent = `${sampleCsvHeader}\n${sampleCsvRow}\n9,97000.00,2024-09-30,100000,200,1800,0,0,30,3333.33,1000.00,0.3,September salary credited,Apex Technologies`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'salarydetails_salary_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (csvText) => {
    try {
      const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== '');
      if (lines.length < 2) {
        showToast('CSV file is empty or missing data rows', 'error');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        if (values.length >= headers.length) {
          const rowObj = {};
          headers.forEach((h, index) => {
            rowObj[h] = values[index];
          });
          rows.push(rowObj);
        }
      }

      setParsedRows(rows);
    } catch (err) {
      showToast('Failed to parse CSV file. Please check formatting.', 'error');
    }
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await api.post('/salaries/import', { records: parsedRows });
      setResult(res);
      showToast(res.message || 'Import completed!');
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      showToast(error.message || 'Failed to import records', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Salary Records from CSV"
      subtitle="Bulk import historical salary slips with automatic duplicate detection"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Step 1: Download Sample Template */}
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-950 dark:bg-indigo-950/30">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div className="text-sm">
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                Need a pre-formatted template?
              </span>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80">
                Download our sample CSV structure with pre-configured columns
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Download Template
          </button>
        </div>

        {/* Step 2: Upload File Box */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-500 transition-colors dark:border-slate-700 dark:hover:border-indigo-500">
          <Upload className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Choose CSV file to import
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Supports standard comma-separated .csv files
          </p>
          <input
            type="file"
            accept=".csv"
            id="csvFileInput"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="csvFileInput"
            className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm"
          >
            {file ? file.name : 'Select File from Computer'}
          </label>
        </div>

        {/* Step 3: Parsed Preview */}
        {parsedRows.length > 0 && !result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Previewing {parsedRows.length} Records to Import:</span>
            </div>
            <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold sticky top-0">
                  <tr>
                    <th className="p-2">Month</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Salary</th>
                    <th className="p-2">PT</th>
                    <th className="p-2">PF Amount</th>
                    <th className="p-2">ESIC</th>
                    <th className="p-2">Diff Amount</th>
                    <th className="p-2">Working Day's</th>
                    <th className="p-2">Per day Salary</th>
                    <th className="p-2">Leave Ded.</th>
                    <th className="p-2">Leave Taken</th>
                    <th className="p-2">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {parsedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-sans font-medium">{row.Month || row.salaryMonth}</td>
                      <td className="p-2 font-bold text-emerald-600">{row.Amount || row.takeHomeSalary || '—'}</td>
                      <td className="p-2">{row.Created || row.effectiveDate || '—'}</td>
                      <td className="p-2">{row.Salary || row.grossSalary || row.monthlyBasicSalary || '—'}</td>
                      <td className="p-2">{row.PT || row.pt || '200'}</td>
                      <td className="p-2">{row['PF Amount'] || row.pfAmount || '1800'}</td>
                      <td className="p-2">{row.ESIC || row.esic || '0'}</td>
                      <td className="p-2">{row['Difference Per Month Amount'] || row.differencePerMonthAmount || '0'}</td>
                      <td className="p-2">{row["Working Day's"] || row.workingDays || '30'}</td>
                      <td className="p-2">{row['Per day Salary'] || row.perDaySalary || '—'}</td>
                      <td className="p-2 text-rose-500">{row['Leave Deduction Amount'] || row.leaveDeductionAmount || '0'}</td>
                      <td className="p-2">{row['Leave Taken'] || row.leaveTaken || '0'}</td>
                      <td className="p-2 font-sans truncate max-w-[120px]">{row.Remark || row.remark || row.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <p className="text-[11px] text-slate-400 text-right">
                Showing first 10 of {parsedRows.length} rows...
              </p>
            )}
          </div>
        )}

        {/* Import Results Banner */}
        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{result.message}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                Successfully Imported: {result.importedCount}
              </div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-sm">
                Duplicates/Skipped: {result.skippedCount}
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1 max-h-32 overflow-y-auto font-mono">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {parsedRows.length > 0 && !result && (
            <button
              type="button"
              disabled={importing}
              onClick={handleUploadSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing Records...
                </>
              ) : (
                `Import ${parsedRows.length} Records`
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImportSalaryModal;
