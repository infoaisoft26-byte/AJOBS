import fs from "fs";
import path from "path";
import * as LucideIcons from "lucide-react";

const validLucide = new Set(Object.keys(LucideIcons));

const reactSymbols = new Set([
  "useState", "useEffect", "useRef", "useCallback", "useMemo", "useContext",
  "createContext", "useReducer", "useId", "useLayoutEffect", "useTransition",
  "useDeferredValue", "useImperativeHandle", "lazy", "Suspense", "memo",
  "forwardRef", "Fragment", "Children", "cloneElement", "isValidElement",
  "createRef", "Component", "PureComponent", "StrictMode",
  // Types
  "Dispatch", "SetStateAction", "FC", "ReactNode", "ChangeEvent", "FormEvent",
  "MouseEvent", "KeyboardEvent", "ClipboardEvent", "DragEvent", "ElementType",
  "HTMLInputElement", "HTMLDivElement", "HTMLFormElement", "RefObject"
]);

const firebaseAuthSymbols = new Set([
  "GoogleAuthProvider", "signInWithPopup", "signInWithEmailAndPassword",
  "createUserWithEmailAndPassword", "signOut", "onAuthStateChanged",
  "sendPasswordResetEmail", "updateProfile", "updatePassword", "getAuth",
  "setPersistence", "browserLocalPersistence", "RecaptchaVerifier",
  "signInWithPhoneNumber", "PhoneAuthProvider", "EmailAuthProvider"
]);

const firebaseFirestoreSymbols = new Set([
  "doc", "getDoc", "setDoc", "updateDoc", "deleteDoc", "collection", "query",
  "where", "getDocs", "onSnapshot", "addDoc", "orderBy", "limit",
  "serverTimestamp", "Timestamp", "writeBatch", "arrayUnion", "arrayRemove",
  "increment", "getFirestore", "enableMultiTabIndexedDbPersistence", "setLogLevel"
]);

const firebaseAppSymbols = new Set([
  "initializeApp", "getApps", "getApp"
]);

const firebaseStorageSymbols = new Set([
  "getStorage", "ref", "uploadBytes", "getDownloadURL", "deleteObject"
]);

const motionSymbols = new Set([
  "motion", "AnimatePresence"
]);

function getAllFiles(dir, files = []) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) getAllFiles(p, files);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) files.push(p);
  });
  return files;
}

const files = getAllFiles("src");
let totalFixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // Step 1: Clean existing corrupt imports from react, firebase/auth, firebase/firestore, motion/react, lucide-react
  // We extract all imported symbols from these packages, group them into correct packages, and re-emit.

  const trackedPkgs = ["react", "firebase/auth", "firebase/firestore", "firebase/app", "firebase/storage", "motion/react", "lucide-react"];

  // Collect all symbols imported across tracked packages
  const importedInFile = {
    reactDefault: false,
    reactNamed: new Set(),
    firebaseAuth: new Set(),
    firebaseFirestore: new Set(),
    firebaseApp: new Set(),
    firebaseStorage: new Set(),
    motion: new Set(),
    lucide: new Set()
  };

  // Code without imports for checking actual usage in file
  const codeWithoutImports = content.replace(/import\s+[\s\S]*?from\s+["'].*?["'];?/g, "");

  // Detect usage in codeWithoutImports
  if (/\bReact\./.test(codeWithoutImports) || /\bReact\b/.test(codeWithoutImports)) {
    importedInFile.reactDefault = true;
  }

  reactSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.reactNamed.add(sym);
    }
  });

  firebaseAuthSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.firebaseAuth.add(sym);
    }
  });

  firebaseFirestoreSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.firebaseFirestore.add(sym);
    }
  });

  firebaseAppSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.firebaseApp.add(sym);
    }
  });

  firebaseStorageSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.firebaseStorage.add(sym);
    }
  });

  motionSymbols.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      importedInFile.motion.add(sym);
    }
  });

  validLucide.forEach(sym => {
    if (new RegExp(`\\b${sym}\\b`).test(codeWithoutImports)) {
      // Exclude if declared locally
      const localDecl = new RegExp(`(?:const|let|var|function|class|type|interface)\\s+${sym}\\b`).test(content);
      if (!localDecl) {
        importedInFile.lucide.add(sym);
      }
    }
  });

  // Remove all existing imports for the tracked packages
  trackedPkgs.forEach(pkg => {
    const reg = new RegExp(`import\\s+([\\s\\S]*?)\\s+from\\s+["']${pkg.replace(/\//g, "\\/")}["'];?\\n?`, "g");
    if (reg.test(content)) {
      content = content.replace(reg, "");
      modified = true;
    }
  });

  // Generate clean new imports
  let newImportBlock = "";

  // React
  if (importedInFile.reactDefault || importedInFile.reactNamed.size > 0) {
    const namedArr = Array.from(importedInFile.reactNamed).sort();
    if (importedInFile.reactDefault && namedArr.length > 0) {
      newImportBlock += `import React, { ${namedArr.join(", ")} } from "react";\n`;
    } else if (importedInFile.reactDefault) {
      newImportBlock += `import React from "react";\n`;
    } else {
      newImportBlock += `import { ${namedArr.join(", ")} } from "react";\n`;
    }
  }

  // Firebase Auth
  if (importedInFile.firebaseAuth.size > 0) {
    const arr = Array.from(importedInFile.firebaseAuth).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "firebase/auth";\n`;
  }

  // Firebase Firestore
  if (importedInFile.firebaseFirestore.size > 0) {
    const arr = Array.from(importedInFile.firebaseFirestore).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "firebase/firestore";\n`;
  }

  // Firebase App
  if (importedInFile.firebaseApp.size > 0) {
    const arr = Array.from(importedInFile.firebaseApp).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "firebase/app";\n`;
  }

  // Firebase Storage
  if (importedInFile.firebaseStorage.size > 0) {
    const arr = Array.from(importedInFile.firebaseStorage).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "firebase/storage";\n`;
  }

  // Motion
  if (importedInFile.motion.size > 0) {
    const arr = Array.from(importedInFile.motion).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "motion/react";\n`;
  }

  // Lucide
  if (importedInFile.lucide.size > 0) {
    const arr = Array.from(importedInFile.lucide).sort();
    newImportBlock += `import { ${arr.join(", ")} } from "lucide-react";\n`;
  }

  content = newImportBlock + content.trimStart();
  fs.writeFileSync(file, content, "utf8");
  totalFixedFiles++;
});

console.log(`Successfully reformatted imports across ${totalFixedFiles} files.`);
