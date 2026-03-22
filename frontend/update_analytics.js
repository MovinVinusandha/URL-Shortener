const fs = require('fs');
const file = '/home/movinvinusandha/Workspace/projects/URL-Shortener/frontend/src/pages/AnalyticsPage.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Update imports
content = content.replace(
  /import \{\s*ArrowLeft, MousePointerClick, Globe, Monitor, \s*Link as LinkIcon, BarChart2, Folder, Tag, Activity,\s*HelpCircle, Gift, ChevronsUpDown,\s*User, Percent, Share2, Search\s*\} from 'lucide-react';/,
  `import { useOutletContext } from 'react-router-dom';\nimport type { DashboardLayoutContext } from '../layouts/DashboardLayout';\nimport { \n  ArrowLeft, MousePointerClick, Globe, Monitor, \n  Link as LinkIcon, Activity,\n  User, Percent, Share2\n} from 'lucide-react';`
);

// 2. Update component start
content = content.replace(
  /const navigate = useNavigate\(\);/,
  `const navigate = useNavigate();\n  const { setNavStats } = useOutletContext<DashboardLayoutContext>();`
);

// 3. Update stats hook
content = content.replace(
  /const clicksByBrowser = data\.clicksByBrowser \|\| \[\];/,
  `const clicksByBrowser = data.clicksByBrowser || [];\n\n  useEffect(() => {\n    setNavStats({ totalClicks, linkCount: 0 });\n  }, [totalClicks, setNavStats]);`
);

// 4. Remove sidebar and header (we will slice by lines)
let lines = content.split('\n');

let returnIndex = lines.findIndex(l => l.startsWith('  return ('));
let mainIndex = lines.findIndex(l => l.includes('<main className="flex-1 w-full'));
if (returnIndex !== -1 && mainIndex !== -1) {
  lines.splice(returnIndex + 1, mainIndex - returnIndex - 1, '    <>');
}

// 5. Remove closing divs at the end
let closingIndex = lines.length - 1;
while (!lines[closingIndex].includes('export default AnalyticsPage')) {
  closingIndex--;
}
let lastDiv1 = -1;
let lastDiv2 = -1;
for (let i = closingIndex - 1; i >= 0; i--) {
  if (lines[i].includes('</div>')) {
    if (lastDiv1 === -1) lastDiv1 = i;
    else if (lastDiv2 === -1) {
      lastDiv2 = i;
      break;
    }
  }
}
if (lastDiv1 !== -1 && lastDiv2 !== -1) {
  lines[lastDiv2] = '    </>';
  lines.splice(lastDiv1, 1);
}

fs.writeFileSync(file, lines.join('\n'));
console.log("AnalyticsPage updated successfully");
