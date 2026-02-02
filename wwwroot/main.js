import { initViewer, loadModel } from "./viewer.js";

function parseProductReleaseFromUrl(location) {
  const params = new URLSearchParams(location.search || "");

  return {
    productId: params.get("productId"),
    releaseId: params.get("releaseId"),
    accessId: params.get("accessId"),
    accessType: params.get("accessType"),
  };
}

function saveProductReleaseData(productReleaseData) {
  localStorage.setItem(
    "productReleaseData",
    JSON.stringify(productReleaseData)
  );
}

function popProductReleaseData() {
  const productReleaseData = JSON.parse(
    localStorage.getItem("productReleaseData")
  );
  if (!productReleaseData) {
    throw new Error("No product release data found");
  }
  localStorage.removeItem("productReleaseData");
  return productReleaseData;
}

function savePreLoginState() {
  const productReleaseData = parseProductReleaseFromUrl(window.location);
  saveProductReleaseData(productReleaseData);
}

function cleanup(event) {
  window.removeEventListener("beforeunload", wrappedCleanup);

  popProductReleaseData();

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

      const productReleaseData = popProductReleaseData();

      loadProductReleaseIntoViewer(productReleaseData);
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
