import { initViewer, loadModel } from "./viewer.js";
import { productIdQueryParam, releaseIdQueryParam, accessIdQueryParam, accessTypeQueryParam } from "./constants.js";

const PRODUCT_RELEASE_DATA_LOCAL_STORAGE_KEY = "productReleaseData";

function parseProductReleaseFromUrl(location) {
  const params = new URLSearchParams(location.search || "");

  return {
    productId: params.get(productIdQueryParam),
    releaseId: params.get(releaseIdQueryParam),
    accessId: params.get(accessIdQueryParam),
    accessType: params.get(accessTypeQueryParam),
  };
}

function buildUrlWithProductReleaseData(productReleaseData) {
  const url = new URL(window.location.href);
  url.searchParams.set(productIdQueryParam, productReleaseData.productId);
  url.searchParams.set(releaseIdQueryParam, productReleaseData.releaseId);
  url.searchParams.set(accessIdQueryParam, productReleaseData.accessId);
  url.searchParams.set(accessTypeQueryParam, productReleaseData.accessType);
  return url.toString();
}

function saveProductReleaseDataToLocalStorage(productReleaseData) {
  localStorage.setItem(
    PRODUCT_RELEASE_DATA_LOCAL_STORAGE_KEY,
    JSON.stringify(productReleaseData)
  );
}

function getProductReleaseDataFromLocalStorage() {
  const productReleaseData = JSON.parse(
    localStorage.getItem(PRODUCT_RELEASE_DATA_LOCAL_STORAGE_KEY)
  );
  return productReleaseData;
}

function removeProductReleaseDataFromLocalStorage() {
  localStorage.removeItem(PRODUCT_RELEASE_DATA_LOCAL_STORAGE_KEY);
}

function savePreLoginState() {
  const productReleaseData = parseProductReleaseFromUrl(window.location);
  // Only save if there is product release data in the URL
  if (productReleaseData) {
    saveProductReleaseDataToLocalStorage(productReleaseData);
  }
}

function cleanup(event) {
  window.removeEventListener("beforeunload", wrappedCleanup);

  removeProductReleaseDataFromLocalStorage();

  const iframe = document.createElement("iframe");
  iframe.style.visibility = "hidden";
  iframe.src = "https://accounts.autodesk.com/Authentication/LogOut";
  document.body.appendChild(iframe);
  iframe.onload = () => {
    window.location.replace("/api/auth/logout");
    document.body.removeChild(iframe);
  };
}

function beforeUnloadCleanup(event) {
  cleanup(event);
}

function setupCleanup() {
  window.addEventListener("beforeunload", beforeUnloadCleanup);
}

function loadProductReleaseIntoViewer(productReleaseData) {
  initViewer(document.getElementById("preview"))
    .then(async (viewer) => {
      try {
        const extension = await viewer.getExtensionAsync(
          "Autodesk.InformedDesign"
        );
        await loadModel(extension, productReleaseData);
      } catch (err) {
        alert(
          "Could not load product release. See the console for more details."
        );
        console.error(err);
      }
    })
    .catch((err) => {
      alert("Could not initialize viewer. See the console for more details.");
      console.error(err);
    });
}

async function initApp() {
  try {
    const resp = await fetch("/api/auth/profile");
    if (resp.ok) {
      const user = await resp.json();

      setupCleanup();

      const productReleaseDataFromUrl = parseProductReleaseFromUrl(window.location);
      // If there is a product release data in the URL, save it to local storage
      if (productReleaseDataFromUrl.productId && productReleaseDataFromUrl.releaseId && productReleaseDataFromUrl.accessId && productReleaseDataFromUrl.accessType) {
        saveProductReleaseDataToLocalStorage(productReleaseDataFromUrl);
      }

      // Check if local storage has product release data
      const productReleaseData = getProductReleaseDataFromLocalStorage();
      if (productReleaseData) {
        // Replace the current URL with the product release data, so the viewer model is consistent
        // with the URL that was used to login.
        const url = buildUrlWithProductReleaseData(productReleaseData);
        window.history.replaceState({}, "", url);
        loadProductReleaseIntoViewer(productReleaseData);
      } else {
        alert("No product release data found in the URL. Please try again.");
      }
    } else {
      savePreLoginState();

      window.location.replace("/api/auth/login");
    }
  } catch (err) {
    alert(
      "Could not initialize the application. See console for more details."
    );
    console.error(err);
  }
}

initApp();
