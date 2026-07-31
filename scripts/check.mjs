import fs from "fs";
import path from "path";

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const lucideIcons = [
  "Activity","Airplay","AlarmCheck","AlarmClock","AlarmClockOff","AlertCircle","AlertOctagon","AlertTriangle","CircleAlert",
  "AlignCenter","AlignJustify","AlignLeft","AlignRight","Anchor","Aperture","Archive","ArrowDown","ArrowDownLeft",
  "ArrowDownRight","ArrowLeft","ArrowRight","ArrowUp","ArrowUpLeft","ArrowUpRight","AtSign","Award","BarChart","BarChart2",
  "BarChart3","Battery","BatteryCharging","Bell","BellOff","Bluetooth","Bold","Book","Bookmark","BookOpen","Box","Briefcase",
  "Building","Building2","Calendar","CalendarCheck","Camera","Cast","Check","CheckCircle","CheckCircle2","CheckSquare","ChevronDown",
  "ChevronLeft","ChevronRight","ChevronUp","ChevronsDown","ChevronsLeft","ChevronsRight","ChevronsUp","Chrome","Circle","Clipboard",
  "Clock","Cloud","CloudDrizzle","CloudLightning","CloudOff","CloudRain","CloudSnow","Code","Codepen","Codesandbox","Coffee",
  "Columns","Command","Compass","Copy","CornerDownLeft","CornerDownRight","CornerLeftDown","CornerLeftUp","CornerRightDown",
  "CornerRightUp","CornerUpLeft","CornerUpRight","Cpu","CreditCard","Crop","Crosshair","Database","Delete","Disc","Divide",
  "DivideCircle","DivideSquare","DollarSign","Download","DownloadCloud","Dribbble","Edit","Edit2","Edit3","ExternalLink","Eye",
  "EyeOff","Facebook","FastForward","Feather","Figma","File","FileCheck","FileCode","FileDown","FileMinus","FilePlus","FileSpreadsheet",
  "FileText","Film","Filter","Flag","Folder","FolderMinus","FolderPlus","Framer","Frown","Gift","GitBranch","GitCommit",
  "GitMerge","GitPullRequest","Github","Gitlab","Globe","Grid","HardDrive","Hash","Headphones","Heart","HelpCircle","Home","Image",
  "Inbox","Info","Instagram","Italic","Key","KeyRound","Layers","Layout","LayoutDashboard","LifeBuoy","Link","Link2","Linkedin","List",
  "Loader","Lock","LockKeyhole","LogIn","LogOut","Mail","Map","MapPin","Maximize","Maximize2","Meh","Menu","MessageCircle","MessageSquare",
  "Mic","MicOff","Minimize","Minimize2","Minus","MinusCircle","MinusSquare","Monitor","Moon","MoreHorizontal","MoreVertical",
  "MousePointer","Move","Music","Navigation","Navigation2","Octagon","Package","Paperclip","Pause","PauseCircle","PenTool","Percent",
  "Phone","PhoneCall","PhoneForwarded","PhoneIncoming","PhoneMissed","PhoneOff","PhoneOutgoing","PieChart","Play","PlayCircle",
  "Plus","PlusCircle","PlusSquare","Power","Printer","Radio","RefreshCw","Repeat","Rewind","RotateCcw","RotateCw","Rss","Save",
  "Scissors","Search","Send","Server","Settings","Share","Share2","Shield","ShieldAlert","ShieldCheck","ShieldOff","ShoppingBag",
  "ShoppingCart","Shuffle","Sidebar","SkipBack","SkipForward","Slack","Sliders","Smartphone","Smile","Speaker","Square","Star",
  "StopCircle","Sun","Sunrise","Sunset","Tablet","Tag","Target","Terminal","Thermometer","ThumbsDown","ThumbsUp","ToggleLeft",
  "ToggleRight","Trash","Trash2","Trello","TrendingDown","TrendingUp","Triangle","Tv","Twitter","Type","Umbrella","Underline",
  "Unlock","Upload","UploadCloud","User","UserCheck","UserMinus","UserPlus","UserX","Users","Video","VideoOff","Voicemail",
  "Volume","Volume1","Volume2","VolumeX","Watch","Wifi","WifiOff","Wind","X","XCircle","XSquare","Zap","ZoomIn","ZoomOut","Sparkles","Sparkle","Brain","Flame"
];

const files = getAllFiles("./src");

files.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const noComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

  const lucideMatch = content.match(/import\s+[\s\S]*?from\s+["']lucide-react["'];?/);
  const importedLucide = new Set();
  if (lucideMatch) {
    const braceMatch = lucideMatch[0].match(/\{([^}]+)\}/);
    if (braceMatch) {
      braceMatch[1].split(",").forEach(s => {
        const parts = s.trim().split(/\s+as\s+/);
        const name = parts[0].trim();
        if (name) importedLucide.add(name);
        if (parts[1]) importedLucide.add(parts[1].trim());
      });
    }
  }

  const missing = [];
  lucideIcons.forEach(icon => {
    const regex = new RegExp("\\b" + icon + "\\b");
    if (regex.test(noComments)) {
      if (!importedLucide.has(icon)) {
        const localDecl = new RegExp("(?:const|let|var|function|class|interface|type)\\s+" + icon + "\\b");
        const importDecl = new RegExp("import\\s+.*\\b" + icon + "\\b");
        if (!localDecl.test(noComments) && !importDecl.test(noComments)) {
          if (icon === "Type" && /\btype\b/.test(noComments) && !/<Type\b/.test(noComments) && !/icon:\s*Type\b/.test(noComments)) return;
          if (icon === "File" && !/<File\b/.test(noComments) && !/icon:\s*File\b/.test(noComments) && !/File\[\]/.test(noComments)) return;
          missing.push(icon);
        }
      }
    }
  });

  if (missing.length > 0) {
    console.log(`[${file}] MISSING: ${missing.join(", ")}`);
    // Fix it automatically
    if (lucideMatch) {
      const block = lucideMatch[0];
      const braceMatch = block.match(/\{([^}]+)\}/);
      if (braceMatch) {
        const existingList = braceMatch[1].trim();
        const newList = [...existingList.split(",").map(s => s.trim()).filter(Boolean), ...missing];
        const uniqueList = Array.from(new Set(newList)).sort();
        const newImportBlock = `import {\n  ${uniqueList.join(",\n  ")}\n} from "lucide-react";`;
        const updatedContent = content.replace(block, newImportBlock);
        fs.writeFileSync(file, updatedContent, "utf8");
      }
    } else {
      const sortedIcons = Array.from(new Set(missing)).sort();
      const newImportBlock = `import {\n  ${sortedIcons.join(",\n  ")}\n} from "lucide-react";\n`;
      fs.writeFileSync(file, newImportBlock + content, "utf8");
    }
  }
});

console.log("Check complete.");
