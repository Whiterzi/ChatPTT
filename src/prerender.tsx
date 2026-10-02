import { renderToString } from 'react-dom/server';
import Home from '../app/page';
export function renderHome() { return renderToString(<Home/>); }
