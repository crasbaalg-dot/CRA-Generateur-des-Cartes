import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, RefreshCw, Upload, CreditCard, User, FileText, 
  Image as ImageIcon, CheckCircle, AlertCircle, LayoutTemplate, 
  Download, Link as LinkIcon, Users, Plus, Trash2, ChevronDown,
  FileImage, FileType
} from 'lucide-react';
import Papa from 'papaparse';
import { toPng, toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility for Tailwind classes ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const WILAYAS = [
  { id: '01', name: 'أدرار' }, { id: '02', name: 'الشلف' }, { id: '03', name: 'الأغواط' }, { id: '04', name: 'أم البواقي' },
  { id: '05', name: 'باتنة' }, { id: '06', name: 'بجاية' }, { id: '07', name: 'بسكرة' }, { id: '08', name: 'بشار' },
  { id: '09', name: 'البليدة' }, { id: '10', name: 'البويرة' }, { id: '11', name: 'تمنراست' }, { id: '12', name: 'تبسة' },
  { id: '13', name: 'تلمسان' }, { id: '14', name: 'تيارت' }, { id: '15', name: 'تيزي وزو' }, { id: '16', name: 'الجزائر' },
  { id: '17', name: 'الجلفة' }, { id: '18', name: 'جيجل' }, { id: '19', name: 'سطيف' }, { id: '20', name: 'سعيدة' },
  { id: '21', name: 'سكيكدة' }, { id: '22', name: 'سيدي بلعباس' }, { id: '23', name: 'عنابة' }, { id: '24', name: 'قالمة' },
  { id: '25', name: 'قسنطينة' }, { id: '26', name: 'المدية' }, { id: '27', name: 'مستغانم' }, { id: '28', name: 'المسيلة' },
  { id: '29', name: 'معسكر' }, { id: '30', name: 'ورقلة' }, { id: '31', name: 'وهران' }, { id: '32', name: 'البيض' },
  { id: '33', name: 'إيليزي' }, { id: '34', name: 'برج بوعريريج' }, { id: '35', name: 'بومرداس' }, { id: '36', name: 'الطارف' },
  { id: '37', name: 'تندوف' }, { id: '38', name: 'تسمسيلت' }, { id: '39', name: 'الوادي' }, { id: '40', name: 'خنشلة' },
  { id: '41', name: 'سوق أهراس' }, { id: '42', name: 'تيبازة' }, { id: '43', name: 'ميلة' }, { id: '44', name: 'عين الدفلى' },
  { id: '45', name: 'النعامة' }, { id: '46', name: 'عين تموشنت' }, { id: '47', name: 'غرداية' }, { id: '48', name: 'غليزان' },
  { id: '49', name: 'تيميمون' }, { id: '50', name: 'برج باجي مختار' }, { id: '51', name: 'أولاد جلال' }, { id: '52', name: 'بني عباس' },
  { id: '53', name: 'عين صالح' }, { id: '54', name: 'عين قزام' }, { id: '55', name: 'تقرت' }, { id: '56', name: 'جانت' },
  { id: '57', name: 'المغير' }, { id: '58', name: 'المنيعة' }
];

const ROLES = [
  'متطوع', 'طبيب متطوع', 'مسعف', 'مكون إسعافات أولية', 
  'رئيس اللجنة', 'أمين سر اللجنة', 'نائب رئيس اللجنة', 'أمين المال', 'رئيس خلية'
];

const CELLS = [
  'الدعم النفسي', 'الإسعافات الأولية', 'ذوي الهمم', 'القانون', 
  'الطلبة والشباب', 'المتطوعين', 'الإعلام والاتصال', 'التضامن', 'التكنولوجيا'
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ATTRIBUTES = [
  'مسعف', 'سائق', 'طباخ', 'مترجم', 'تقني', 'منظم', 'مصور', 'إعلامي'
];

const CARD_SIZES = {
  standard: { id: 'standard', name: 'الحجم القياسي (CR80)', width: '85.6mm', height: '54mm', isVertical: false },
};

const CRA_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Algerian_Red_Crescent_logo.svg';

// --- Helpers for Data Processing ---
const processPhotoUrl = (url: string | null) => {
  if (!url) return null;
  let trimmedUrl = url.trim();
  
  // Remove quotes if present
  trimmedUrl = trimmedUrl.replace(/^["']|["']$/g, '');

  // Match Google Drive ID from various URL patterns
  // Patterns: /d/ID, id=ID, uc?id=ID, open?id=ID, file/d/ID, etc.
  const driveMatch = trimmedUrl.match(/(?:id=|\/d\/|\/file\/d\/|usercontent\.com\/d\/|uc\?id=|open\?id=)([\w-]{25,50})/);
  if (driveMatch && driveMatch[1]) {
    const id = driveMatch[1];
    // lh3.googleusercontent.com/d/ID is the most reliable for direct embedding and CORS
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  
  // If it looks like just a Google Drive ID
  if (/^[\w-]{25,50}$/.test(trimmedUrl) && !trimmedUrl.includes('.') && !trimmedUrl.includes('/')) {
    return `https://lh3.googleusercontent.com/d/${trimmedUrl}`;
  }

  return trimmedUrl;
};

const processWilaya = (val: any) => {
  if (!val) return '';
  const v = val.toString().trim();
  const found = WILAYAS.find(w => w.id === v || w.id === v.padStart(2, '0') || w.name === v);
  return found ? found.id : '';
};

// --- Components ---

interface CardData {
  id?: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameFr: string;
  lastNameFr: string;
  role: string;
  cellName: string;
  birthDate: string;
  birthPlace: string;
  wilaya: string;
  volunteerId: string;
  photoUrl: string | null;
  bloodType: string;
  attributes: string[];
  issueDate: string;
  expiryDate: string;
}

const VolunteerCard = React.forwardRef<HTMLDivElement, { data: CardData, size: typeof CARD_SIZES.standard }>(({ data, size }, ref) => {
  const [imgError, setImgError] = useState(false);
  
  // Reset image error state when photo URL changes
  useEffect(() => {
    setImgError(false);
  }, [data.photoUrl]);

  const selectedWilayaObj = WILAYAS.find(w => w.id === data.wilaya);
  const wilayaName = selectedWilayaObj ? selectedWilayaObj.name : '...';
  const qrData = `${data.wilaya}-${data.volunteerId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=ffffff`;

  return (
    <div className="flex flex-col gap-4 print:gap-0 items-center select-none">
      {/* Front Side */}
      <div 
        ref={ref}
        className="relative bg-white overflow-hidden rounded-[3mm] shadow-xl border border-gray-200 print:shadow-none print:border-gray-300 shrink-0"
        style={{ width: size.width, height: size.height, boxSizing: 'border-box' }}
      >
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
          <img src={CRA_LOGO} alt="" className="w-[70%]" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-[14mm] bg-white border-b border-red-100 flex items-center px-[3mm] z-10">
          <img src={CRA_LOGO} alt="CRA" className="h-[10mm] w-auto ml-[2mm]" crossOrigin="anonymous" referrerPolicy="no-referrer" />
          <div className="flex flex-col text-right items-start">
            <span className="text-[9px] font-black text-red-600 leading-tight">الهلال الأحمر الجزائري</span>
            <span className="text-[7px] font-bold text-gray-800 leading-tight font-fr">Algerian Red Crescent</span>
            <span className="text-[7px] font-bold text-gray-800 leading-tight font-fr">Croissant-Rouge Algérien</span>
          </div>
          <div className="mr-auto flex flex-col justify-center items-end">
            <span className="text-[7px] font-bold text-red-600">اللجنة الولائية</span>
            <span className="text-[9px] font-black text-gray-900">{wilayaName}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="absolute top-[14mm] bottom-0 left-0 right-0 flex p-[3mm] z-10">
          {/* Photo */}
          <div className="w-[24mm] h-[30mm] bg-gray-50 border border-red-200 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
            {data.photoUrl && !imgError ? (
              <img 
                key={data.photoUrl}
                src={data.photoUrl} 
                alt="" 
                className="w-full h-full object-cover" 
                crossOrigin={data.photoUrl.startsWith('data:') ? undefined : "anonymous"} 
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <User className="w-10 h-10 text-gray-300" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col pr-[3mm] overflow-hidden">
            <div className="mb-[1mm]">
              <h3 className="text-[13px] font-bold text-gray-900 truncate leading-tight">
                {data.lastNameAr} {data.firstNameAr}
              </h3>
              <p className="text-[9px] font-medium text-gray-500 font-fr uppercase truncate leading-tight">
                {data.lastNameFr} {data.firstNameFr}
              </p>
            </div>

            {/* Role & Cell */}
            <div className="flex flex-col gap-[1mm] mt-[1mm]">
              <div className="bg-red-600 text-white px-[2mm] py-[0.5mm] rounded-sm w-fit max-w-full">
                <span className="text-[10px] font-bold truncate block">
                  {data.role === 'رئيس خلية' ? `رئيس خلية ${data.cellName}` : data.role}
                </span>
              </div>
              
              {/* Attributes */}
              {data.attributes.length > 0 && (
                <div className="flex flex-wrap gap-[1mm]">
                  {data.attributes.map((attr, idx) => (
                    <span 
                      key={idx} 
                      className={cn(
                        "text-[8px] px-[1.5mm] py-[0.2mm] rounded-sm border",
                        idx === 0 ? "bg-red-600 border-red-600 text-white font-bold" : "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Birth Info */}
            <div className="mt-auto mb-[1mm]">
              <p className="text-[8px] font-bold text-gray-700">
                تاريخ ومكان الميلاد: <span className="text-gray-900">{data.birthDate || '----------'} بـ {data.birthPlace || '----------'}</span>
              </p>
            </div>
          </div>

          {/* Blood Type & QR */}
          <div className="w-[15mm] flex flex-col items-center justify-between shrink-0 py-[1mm]">
            <div className="flex flex-col items-center">
              <span className="text-[6px] font-bold text-gray-400 leading-none">GS</span>
              <span className="text-[11px] font-black text-red-600 leading-none">{data.bloodType || '??'}</span>
            </div>
            <img src={qrCodeUrl} alt="QR" className="w-[12mm] h-[12mm]" crossOrigin="anonymous" />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-red-600"></div>
      </div>

      {/* Back Side (Optional, but good for completeness) */}
      <div 
        className="relative bg-white overflow-hidden rounded-[3mm] shadow-xl border border-gray-200 print:shadow-none print:border-gray-300 shrink-0 hidden print:block"
        style={{ width: size.width, height: size.height, boxSizing: 'border-box' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-[5mm] text-center">
          <img src={CRA_LOGO} alt="" className="w-[15mm] mb-[3mm]" />
          <h4 className="text-[10px] font-bold text-gray-800">بطاقة متطوع الهلال الأحمر الجزائري</h4>
          <p className="text-[7px] text-gray-500 mt-[2mm] max-w-[60mm]">
            هذه البطاقة شخصية وتثبت هوية المتطوع في الهلال الأحمر الجزائري. يرجى إعادتها إلى اللجنة الولائية في حال العثور عليها أو انتهاء الصلاحية.
          </p>
          <div className="mt-[4mm] border-t border-gray-100 pt-[2mm] w-full flex flex-col gap-[1mm]">
             <span className="text-[8px] font-black text-gray-900 font-fr">ID: {data.volunteerId}</span>
             <div className="flex justify-center gap-[4mm]">
               <span className="text-[7px] text-gray-400">الإصدار: <span className="text-gray-700 font-bold">{data.issueDate}</span></span>
               <span className="text-[7px] text-gray-400">الانتهاء: <span className="text-gray-700 font-bold">{data.expiryDate || '----------'}</span></span>
             </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1.5mm] bg-red-600"></div>
      </div>
    </div>
  );
});

export default function App() {
  const [view, setView] = useState<'single' | 'sheets'>('single');
  const [formData, setFormData] = useState<CardData>({
    firstNameAr: '', lastNameAr: '', firstNameFr: '', lastNameFr: '',
    role: '', cellName: '', birthDate: '', birthPlace: '',
    wilaya: '', volunteerId: '', photoUrl: null, bloodType: '', attributes: [],
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: ''
  });
  const [batchData, setBatchData] = useState<CardData[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const batchCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const downloadCard = async (format: 'png' | 'jpg', cardData: CardData, element?: HTMLDivElement | null) => {
    const target = element || cardRef.current;
    if (!target) return;
    
    setIsLoading(true);
    try {
      const options = {
        quality: 0.95,
        pixelRatio: 3, // High resolution
        backgroundColor: '#ffffff',
      };

      let dataUrl;
      if (format === 'png') {
        dataUrl = await toPng(target, options);
      } else {
        dataUrl = await toJpeg(target, options);
      }

      const fileName = `CRA-Card-${cardData.lastNameFr}-${cardData.firstNameFr}.${format}`;
      saveAs(dataUrl, fileName);
    } catch (err) {
      console.error('Export failed', err);
      setError('فشل تصدير الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
      setShowExportDropdown(false);
    }
  };

  useEffect(() => {
    document.title = "منصة بطاقات الهلال الأحمر الجزائري";
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAttributeToggle = (attr: string) => {
    setFormData(prev => {
      if (prev.attributes.includes(attr)) {
        return { ...prev, attributes: prev.attributes.filter(a => a !== attr) };
      }
      if (prev.attributes.length >= 5) return prev;
      return { ...prev, attributes: [...prev.attributes, attr] };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const fetchGoogleSheet = async () => {
    setError(null);
    if (!sheetUrl.trim()) {
      setError('يرجى إدخال رابط ملف Google Sheets أولاً.');
      return;
    }
    setIsLoading(true);
    try {
      let csvUrl = '';
      
      // Handle "Published to web" CSV links directly
      if (sheetUrl.includes('/pub?') && sheetUrl.includes('output=csv')) {
        csvUrl = sheetUrl;
      } 
      // Handle "Published to web" HTML links by converting to CSV
      else if (sheetUrl.includes('/pubhtml') || (sheetUrl.includes('/pub') && !sheetUrl.includes('output=csv'))) {
        csvUrl = sheetUrl.replace(/\/pubhtml|\/pub/, '/pub?output=csv');
      }
      // Handle standard spreadsheet URLs
      else if (sheetUrl.includes('docs.google.com/spreadsheets/d/')) {
        const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
        if (!sheetIdMatch) {
          throw new Error('رابط غير صالح. يرجى التأكد من نسخ رابط Google Sheet بشكل صحيح (مثلاً: رابط المشاركة أو رابط النشر على الويب).');
        }
        
        const sheetId = sheetIdMatch[1];
        const isPublished = sheetUrl.includes('/d/e/');
        
        if (isPublished) {
          csvUrl = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`;
        } else {
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        }
      } else {
        throw new Error('الرابط المدخل لا يبدو كرابط Google Sheets صحيح. يرجى التأكد من الرابط.');
      }

      console.log('Fetching from:', csvUrl);
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('الملف غير موجود (404). تأكد من أن المعرف في الرابط صحيح وأن الملف لم يتم حذفه.');
        }
        throw new Error(`خطأ في الاتصال: ${response.status}`);
      }
      
      const csvText = await response.text();
      
      // Basic check if we got HTML instead of CSV (usually happens if sheet is private)
      if (csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
        throw new Error('الملف خاص أو غير متاح. يرجى التأكد من أن الملف "متاح لأي شخص لديه الرابط" (Anyone with the link) أو استخدم خيار "النشر على الويب" (Publish to web).');
      }
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV Parsing errors:', results.errors);
          }
          
          const mappedData: CardData[] = results.data.map((row: any, idx: number) => ({
            id: `row-${idx}`,
            firstNameAr: row['الاسم (عربي)'] || row['firstNameAr'] || '',
            lastNameAr: row['اللقب (عربي)'] || row['lastNameAr'] || '',
            firstNameFr: row['الاسم (فرنسي)'] || row['firstNameFr'] || '',
            lastNameFr: row['اللقب (فرنسي)'] || row['lastNameFr'] || '',
            role: row['الصفة'] || row['role'] || 'متطوع',
            cellName: row['الخلية'] || row['cellName'] || '',
            birthDate: row['تاريخ الميلاد'] || row['birthDate'] || '',
            birthPlace: row['مكان الميلاد'] || row['birthPlace'] || '',
            wilaya: processWilaya(row['اللجنة الولائية'] || row['wilaya'] || ''),
            volunteerId: row['رقم المتطوع'] || row['volunteerId'] || String(idx + 1000),
            photoUrl: processPhotoUrl(row['الصورة الشخصية'] || row['photoUrl'] || row['Photo'] || row['image'] || row['Image'] || row['Picture'] || row['photo']),
            bloodType: row['الزمرة الدموية'] || row['bloodType'] || '',
            attributes: (row['الصفات'] || row['attributes'] || '').split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 5),
            issueDate: row['تاريخ الإصدار'] || row['issueDate'] || new Date().toISOString().split('T')[0],
            expiryDate: row['تاريخ الانتهاء'] || row['expiryDate'] || ''
          }));
          
          if (mappedData.length === 0) {
            setError('لم يتم العثور على بيانات في الملف. تأكد من مطابقة أسماء الأعمدة.');
          } else {
            setBatchData(mappedData);
          }
          setIsLoading(false);
        },
        error: (error) => {
          setError(`خطأ في تحليل البيانات: ${error.message}`);
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      console.error('Fetch failed', err);
      setIsLoading(false);
      setError(err.message || 'فشل جلب البيانات. تأكد من أن الرابط صحيح وأن الملف متاح للجميع (Public).');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-100" dir="rtl">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          #print-container { display: block !important; width: 100% !important; }
          .card-wrapper { page-break-inside: avoid; margin-bottom: 10mm; display: flex; justify-content: center; }
        }
      `}} />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-2 rounded-xl">
              <img src={CRA_LOGO} alt="CRA" className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">منصة بطاقات الهلال الأحمر</h1>
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Algerian Red Crescent Cards</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setView('single')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 active:scale-95",
                view === 'single' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <User className="w-4 h-4" /> بطاقة فردية
            </button>
            <button 
              onClick={() => setView('sheets')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 active:scale-95",
                view === 'sheets' ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LinkIcon className="w-4 h-4" /> استيراد من غوغل
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 no-print">
        {view === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Section */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black">بيانات المتطوع</h2>
                  </div>
                  <button 
                    onClick={() => setFormData({
                      firstNameAr: '', lastNameAr: '', firstNameFr: '', lastNameFr: '',
                      role: '', cellName: '', birthDate: '', birthPlace: '',
                      wilaya: '', volunteerId: '', photoUrl: null, bloodType: '', attributes: []
                    })} 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:rotate-180 duration-500 active:scale-90"
                    title="تفريغ الحقول"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-8">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الاسم (عربي)</label>
                      <input name="firstNameAr" value={formData.firstNameAr} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none" placeholder="أحمد" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">اللقب (عربي)</label>
                      <input name="lastNameAr" value={formData.lastNameAr} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none" placeholder="سليمان" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">First Name (FR)</label>
                      <input name="firstNameFr" value={formData.firstNameFr} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none font-fr" dir="ltr" placeholder="Ahmed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">Last Name (FR)</label>
                      <input name="lastNameFr" value={formData.lastNameFr} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none font-fr" dir="ltr" placeholder="SLIMANE" />
                    </div>
                  </div>

                  {/* Role & Cell */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الصفة</label>
                      <div className="relative">
                        <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none appearance-none bg-white">
                          <option value="">اختر الصفة</option>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {formData.role === 'رئيس خلية' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-bold text-slate-700 mr-1">اسم الخلية</label>
                        <div className="relative">
                          <select name="cellName" value={formData.cellName} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-50/50 transition-all outline-none appearance-none bg-white">
                            <option value="">اختر الخلية</option>
                            {CELLS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attributes Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 mr-1">الصفات الإضافية (بحد أقصى 5)</label>
                    <div className="flex flex-wrap gap-2">
                      {ATTRIBUTES.map(attr => (
                        <button
                          key={attr}
                          onClick={() => handleAttributeToggle(attr)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                            formData.attributes.includes(attr) 
                              ? "bg-red-600 border-red-600 text-white shadow-md shadow-red-100" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-red-200"
                          )}
                        >
                          {attr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Birth & Blood */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">تاريخ الميلاد</label>
                      <input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">مكان الميلاد</label>
                      <input name="birthPlace" value={formData.birthPlace} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none" placeholder="الجزائر" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">الزمرة الدموية</label>
                      <div className="relative">
                        <select name="bloodType" value={formData.bloodType} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none appearance-none bg-white">
                          <option value="">اختر</option>
                          {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Wilaya & ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">اللجنة الولائية</label>
                      <div className="relative">
                        <select name="wilaya" value={formData.wilaya} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none appearance-none bg-white">
                          <option value="">اختر الولاية</option>
                          {WILAYAS.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name}</option>)}
                        </select>
                        <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">رقم المتطوع</label>
                      <input name="volunteerId" value={formData.volunteerId} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none font-fr" placeholder="12345" />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">تاريخ الإصدار (تلقائي)</label>
                      <input type="date" name="issueDate" value={formData.issueDate} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 mr-1">تاريخ الانتهاء</label>
                      <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-red-500 transition-all outline-none" />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 mr-1">الصورة الشخصية</label>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 hover:border-red-200 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {formData.photoUrl ? (
                          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-red-500 shadow-lg">
                            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                              <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 group-hover:text-red-600">اضغط لرفع الصورة</p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-5 sticky top-28 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-8">
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-red-600" /> معاينة البطاقة
                  </h2>
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  </div>
                </div>

                <div className="bg-slate-100 p-10 rounded-[40px] border-4 border-white shadow-inner mb-8">
                  <VolunteerCard ref={cardRef} data={formData} size={CARD_SIZES.standard} />
                </div>

                <div className="w-full space-y-3">
                  <button 
                    onClick={() => window.print()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                  >
                    <Printer className="w-5 h-5" /> طباعة البطاقة
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-red-500 hover:text-red-600 text-slate-700 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                    >
                      <ImageIcon className="w-5 h-5" /> تصدير كصورة <ChevronDown className={cn("w-4 h-4 transition-transform", showExportDropdown && "rotate-180")} />
                    </button>
                    
                    {showExportDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <button 
                          onClick={() => downloadCard('png', formData)}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 text-slate-700 font-bold transition-colors border-b border-slate-100 disabled:opacity-50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                            <FileImage className="w-4 h-4" />
                          </div>
                          <span>تصدير بصيغة PNG (دقة عالية)</span>
                        </button>
                        <button 
                          onClick={() => downloadCard('jpg', formData)}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 text-slate-700 font-bold transition-colors disabled:opacity-50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                            <FileType className="w-4 h-4" />
                          </div>
                          <span>تصدير بصيغة JPG (حجم أصغر)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
                <div className="flex gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-black text-red-900">تنبيه القياسات</p>
                    <p className="text-xs text-red-700 leading-relaxed">تم ضبط البطاقة وفق المقاييس الفيزيائية الدقيقة (85.6mm × 54mm). عند الطباعة، تأكد من ضبط مقياس الصفحة على 100% (Actual Size).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Google Sheets View */
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                    <LinkIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">الربط بجداول غوغل</h2>
                    <p className="text-sm text-slate-500">استيراد بيانات المتطوعين من ملف Google Sheets مباشرة.</p>
                  </div>
                </div>
                {batchData.length > 0 && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-red-100 active:scale-95"
                    >
                      <Printer className="w-5 h-5" /> طباعة الكل ({batchData.length})
                    </button>
                    <button 
                      onClick={() => setBatchData([])}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3 rounded-2xl transition-all active:scale-95"
                    >
                      مسح القائمة
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-black text-blue-900">نصيحة للسرعة:</p>
                    <p className="text-xs text-blue-700 leading-relaxed">استخدم خيار "النشر على الويب" بصيغة CSV من قائمة ملف في Google Sheets للحصول على أفضل النتائج.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    'الاسم (عربي)', 'اللقب (عربي)', 'الاسم (فرنسي)', 'اللقب (فرنسي)',
                    'الصفة', 'الخلية', 'تاريخ الميلاد', 'مكان الميلاد',
                    'الزمرة الدموية', 'اللجنة الولائية', 'رقم المتطوع', 'الصورة الشخصية',
                    'تاريخ الإصدار', 'تاريخ الانتهاء'
                  ].map(col => (
                    <div key={col} className="bg-white/50 px-3 py-1.5 rounded-lg border border-blue-100 text-[10px] font-bold text-blue-800 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-blue-500" /> {col}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex gap-3">
                  <input 
                    value={sheetUrl} 
                    onChange={(e) => {
                      setSheetUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    className={cn(
                      "flex-1 px-5 py-3 rounded-xl border outline-none transition-all bg-white",
                      error ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-emerald-500"
                    )} 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                  />
                  <button 
                    onClick={fetchGoogleSheet}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-100 active:scale-95"
                  >
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    جلب البيانات
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{error}</span>
                  </div>
                )}
              </div>
              
              {!batchData.length && !isLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold">لا توجد بيانات مستوردة حالياً</p>
                  <p className="text-sm mt-1">أدخل الرابط أعلاه واضغط على جلب البيانات للبدء.</p>
                </div>
              )}
            </div>

            {batchData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {batchData.map((data, idx) => (
                  <div key={data.id || idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="absolute top-4 left-4 flex gap-2 z-20">
                      <div className="relative group/export">
                        <button 
                          className="w-8 h-8 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                          title="تصدير كصورة"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute top-full left-0 mt-1 hidden group-hover/export:block bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[120px]">
                          <button 
                            onClick={() => downloadCard('png', data, batchCardRefs.current[data.id!])}
                            className="w-full text-right px-4 py-2 text-[10px] font-bold hover:bg-slate-50 text-slate-600 border-b border-slate-100"
                          >
                            PNG
                          </button>
                          <button 
                            onClick={() => downloadCard('jpg', data, batchCardRefs.current[data.id!])}
                            className="w-full text-right px-4 py-2 text-[10px] font-bold hover:bg-slate-50 text-slate-600"
                          >
                            JPG
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => setBatchData(prev => prev.filter((_, i) => i !== idx))}
                        className="w-8 h-8 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <VolunteerCard 
                      ref={(el) => { batchCardRefs.current[data.id!] = el; }}
                      data={data} 
                      size={CARD_SIZES.standard} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div id="print-container" className="hidden">
        {view === 'single' ? (
          <div className="card-wrapper">
            <VolunteerCard data={formData} size={CARD_SIZES.standard} />
          </div>
        ) : batchData.length > 0 ? (
          batchData.map((data, idx) => (
            <div key={data.id || idx} className="card-wrapper">
              <VolunteerCard data={data} size={CARD_SIZES.standard} />
            </div>
          ))
        ) : null}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 no-print">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-50">
            <img src={CRA_LOGO} alt="" className="h-6 grayscale" />
            <span className="text-sm font-bold">الهلال الأحمر الجزائري - اللجنة الولائية</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">© {new Date().getFullYear()} جميع الحقوق محفوظة للهلال الأحمر الجزائري</p>
        </div>
      </footer>
    </div>
  );
}
