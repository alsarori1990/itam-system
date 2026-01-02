import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Settings2 } from 'lucide-react';
import { Asset } from '../types';
import { useApp } from '../context/AppContext';

interface AssetLabelPrinterProps {
  assets: Asset[];
  onClose: () => void;
}

type LabelSize = 'standard' | 'small' | 'large';

export const AssetLabelPrinter: React.FC<AssetLabelPrinterProps> = ({ assets, onClose }) => {
  const { logAction } = useApp();
  const [labelSize, setLabelSize] = useState<LabelSize>('standard');

  const handlePrint = () => {
    // Log the action
    const assetIds = assets.map(a => a.serialNumber).join(', ');
    logAction('طباعة ملصقات', `تم طباعة ${assets.length} ملصق/ملصقات. الأرقام التسلسلية: ${assetIds}`);
    
    // Trigger print
    window.print();
  };

  // Dimensions configuration (in CSS readable units)
  // Increased font sizes and padding for better readability
  const sizeConfig = {
    small: { 
        width: '50mm', 
        height: '30mm', 
        className: 'text-[9px] p-2',
        qrSize: 40
    },
    standard: { 
        width: '70mm', 
        height: '40mm', 
        className: 'text-[12px] p-3', // Increased from 10px
        qrSize: 56
    },
    large: { 
        width: '100mm', 
        height: '50mm', 
        className: 'text-[14px] p-4', // Increased from xs (12px)
        qrSize: 72
    },
  };

  const renderLabelContent = (asset: Asset) => (
    <div className={`flex flex-col justify-between w-full h-full ${sizeConfig[labelSize].className}`}>
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-1.5 shrink-0">
            <span className="font-black uppercase tracking-tighter leading-none text-black">Dar Alesnad IT</span>
            <span className="font-mono font-bold text-[0.9em] leading-none text-black">{asset.id}</span>
        </div>
        
        {/* Body */}
        <div className="flex flex-1 gap-3 items-center min-h-0">
            <div className="bg-white shrink-0 flex items-center justify-center">
                <QRCodeSVG value={asset.serialNumber} size={sizeConfig[labelSize].qrSize} level="M" />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full gap-1">
                {/* Name: Bold, larger, truncated */}
                <div className="font-bold text-black leading-tight truncate text-[1.1em]" title={asset.name}>
                    {asset.name}
                </div>
                
                {/* Details Group */}
                <div className="space-y-0.5 w-full">
                    {/* Serial: Monospace, high contrast */}
                    <div className="text-[0.85em] text-slate-800 leading-tight font-mono font-bold truncate">
                        S/N: {asset.serialNumber}
                    </div>
                    
                    {/* Meta: Type & Location */}
                    <div className="flex flex-col text-[0.75em] leading-tight text-slate-700 font-semibold mt-0.5">
                        <span className="truncate uppercase tracking-wide opacity-80">{asset.type}</span>
                        <span className="truncate">{asset.location}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in print:bg-white print:static print:block print:p-0 print:h-auto">
      
      {/* Configuration Modal - Hidden during print */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col print:hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Printer size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">طباعة ملصقات الأصول</h2>
                <p className="text-slate-500 text-sm">معاينة وإعداد الطباعة لعدد {assets.length} أصل</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           
           {/* Sidebar: Settings */}
           <div className="w-full md:w-64 bg-slate-50 p-6 border-l border-slate-100 space-y-6">
              <div>
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <Settings2 size={16} />
                    حجم الملصق
                 </label>
                 <div className="space-y-2">
                    <button 
                       onClick={() => setLabelSize('small')}
                       className={`w-full p-3 rounded-xl border text-right text-sm transition-all ${labelSize === 'small' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                    >
                       صغير (50mm x 30mm)
                    </button>
                    <button 
                       onClick={() => setLabelSize('standard')}
                       className={`w-full p-3 rounded-xl border text-right text-sm transition-all ${labelSize === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                    >
                       قياسي (70mm x 40mm)
                    </button>
                    <button 
                       onClick={() => setLabelSize('large')}
                       className={`w-full p-3 rounded-xl border text-right text-sm transition-all ${labelSize === 'large' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                    >
                       كبير (100mm x 50mm)
                    </button>
                 </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                 تأكد من ضبط إعدادات الطابعة إلى:
                 <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>إلغاء الهوامش (Margins: None)</li>
                    <li>اختيار حجم الورق المناسب</li>
                 </ul>
              </div>
           </div>

           {/* Preview Area */}
           <div className="flex-1 bg-slate-200 p-8 overflow-y-auto flex flex-col items-center">
              <h3 className="mb-4 text-slate-500 text-sm font-bold">معاينة مباشرة</h3>
              <div className="flex flex-wrap justify-center gap-6">
                 {assets.map((asset, index) => (
                    <div 
                      key={index}
                      className="bg-white shadow-sm border border-slate-300 flex overflow-hidden relative"
                      style={{ 
                         width: sizeConfig[labelSize].width, 
                         height: sizeConfig[labelSize].height,
                      }}
                    >
                       {renderLabelContent(asset)}
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
           <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">
              إلغاء
           </button>
           <button onClick={handlePrint} className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 flex items-center gap-2 shadow-lg shadow-slate-200">
              <Printer size={18} />
              طباعة ({assets.length})
           </button>
        </div>
      </div>

      {/* Actual Print View (Visible only in @media print) */}
      <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-[9999]">
         {assets.map((asset, index) => (
            <div 
               key={asset.id}
               className="print-label-container"
               style={{ 
                  width: sizeConfig[labelSize].width, 
                  height: sizeConfig[labelSize].height,
                  pageBreakAfter: 'always',
                  breakInside: 'avoid',
                  overflow: 'hidden',
                  display: 'flex',
                  backgroundColor: 'white',
                  border: '1px solid #000', // Optional: Remove if pre-cut labels
                  margin: '0 auto' // Center on roll
               }}
            >
                {renderLabelContent(asset)}
            </div>
         ))}
      </div>
    </div>
  );
};