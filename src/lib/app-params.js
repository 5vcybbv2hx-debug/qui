const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		try { storage.setItem(storageKey, searchParam); } catch (e) {}
		return searchParam;
	}
	if (defaultValue) {
		try { storage.setItem(storageKey, defaultValue); } catch (e) {}
		return defaultValue;
	}
	let storedValue = null;
	try {
		storedValue = storage.getItem(storageKey);
	} catch (e) {}
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		try { storage.removeItem('base44_access_token'); } catch (e) {}
		try { storage.removeItem('base44_token'); } catch (e) {}
	}
	const token = getAppParamValue("access_token", { removeFromUrl: true });
	// Speichere Token sowohl als access_token als auch als base44_token
	if (token) {
		try { storage.setItem('base44_token', token); } catch (e) {}
		try { storage.setItem('base44_access_token', token); } catch (e) {}
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: token,
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
	}

	export const appParams = {
	...getAppParams()
}