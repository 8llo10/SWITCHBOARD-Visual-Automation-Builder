import './globals.css';
import './neo.css';
import './control.css';
export const metadata={
  title:{default:'SWITCHBOARD — Visual IT Automation',template:'%s · SWITCHBOARD'},
  description:'Build, execute and govern real IT automation workflows visually.',
  icons:{icon:'/switchboard-logo.webp',shortcut:'/switchboard-logo.webp',apple:'/switchboard-logo.webp'}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
