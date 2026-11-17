import './fonts';
import './styles.css';
import './polish.css';
import { App } from './ui/app';

const root = document.getElementById('app');
if (root) new App(root);
