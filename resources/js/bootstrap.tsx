import axios from 'axios';
import './lib/polyfills';
declare global {
	interface Window {
		axios: typeof axios;
	}
}
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
