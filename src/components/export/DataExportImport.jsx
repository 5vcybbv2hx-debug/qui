// Data Export/Import: CSV, Excel, JSON
import { useState } from 'react';
import * as XLSX from 'xlsx';

class DataExporter {
  // Export zu CSV
  static toCSV(data, filename = 'export.csv') {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(header => {
        const value = item[header];
        // Escape CSV special chars
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      })
    );

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    this.downloadFile(csv, filename, 'text/csv');
  }

  // Export zu Excel
  static toExcel(data, filename = 'export.xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
  }

  // Export zu JSON
  static toJSON(data, filename = 'export.json') {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  }

  // Backup (komplett mit Metadaten)
  static createBackup(data, appName = 'BarManager') {
    const backup = {
      metadata: {
        exportDate: new Date().toISOString(),
        appName,
        version: '1.0',
        recordCount: Array.isArray(data) ? data.length : 1
      },
      data
    };

    const json = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    this.downloadFile(json, `${appName}_backup_${timestamp}.json`, 'application/json');
  }

  static downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

class DataImporter {
  // Importiere CSV
  static async fromCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = this.parseCSVLine(line);
              const obj = {};
              headers.forEach((header, idx) => {
                obj[header] = values[idx]?.trim() || '';
              });
              return obj;
            });

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  // Importiere Excel
  static async fromExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Importiere JSON
  static async fromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          // Wenn Backup-Format, extrahiere nur data
          const data = json.data || json;
          resolve(Array.isArray(data) ? data : [data]);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Auto-detect Format basierend auf File-Extension
  static async importFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    switch (extension) {
      case 'csv':
        return this.fromCSV(file);
      case 'xlsx':
      case 'xls':
        return this.fromExcel(file);
      case 'json':
        return this.fromJSON(file);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }
}

// React Component für Import/Export
export function DataExportImportUI({ data = [], entityName = 'Data' }) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleExport = (format) => {
    const filename = `${entityName}_${new Date().toISOString().slice(0, 10)}`;

    switch (format) {
      case 'csv':
        DataExporter.toCSV(data, `${filename}.csv`);
        break;
      case 'excel':
        DataExporter.toExcel(data, `${filename}.xlsx`);
        break;
      case 'json':
        DataExporter.toJSON(data, `${filename}.json`);
        break;
      case 'backup':
        DataExporter.createBackup(data, entityName);
        break;
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const importedData = await DataImporter.importFile(file);
      setImportResult({
        success: true,
        count: importedData.length,
        data: importedData
      });
    } catch (error) {
      setImportResult({
        success: false,
        error: error.message
      });
    } finally {
      setImporting(false);
    }
  };

  return {
    handleExport,
    handleImport,
    importing,
    importResult,
    setImportResult
  };
}

export { DataExporter, DataImporter };