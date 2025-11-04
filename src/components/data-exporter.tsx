'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface DataExporterProps {
  data: object;
}

export function DataExporter({ data }: DataExporterProps) {
  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `tabletop-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <FileDown className="mr-2 h-4 w-4" />
      Export Data
    </Button>
  );
}
