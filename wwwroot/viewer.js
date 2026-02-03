import { productIdQueryParam, releaseIdQueryParam, accessIdQueryParam, accessTypeQueryParam } from "./constants.js";

async function getAccessToken(callback) {
  try {
    const resp = await fetch("/api/auth/token");
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const { access_token, expires_in } = await resp.json();
    callback(access_token, expires_in);
  } catch (err) {
    alert("Could not obtain access token. See the console for more details.");
    console.error(err);
  }
}

export function initViewer(container) {
  return new Promise(function (resolve, reject) {
    Autodesk.Viewing.Initializer(
      { env: "AutodeskProduction", getAccessToken },
      function () {
        const config = {
          extensions: ["Autodesk.InformedDesign"],
        };
        const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
        const startedCode = viewer.start();
        if (startedCode > 0) {
          reject(
            new Error(
              "Failed to create a Viewer: WebGL not supported or init error."
            )
          );
          return;
        }
        viewer.setTheme("light-theme");
        viewer
          .getExtensionAsync("Autodesk.InformedDesign")
          .then((extension) => extension.setTheme("light-theme"))
          .catch((error) => {
            console.error(
              "Failed to set Informed Design extension theme:",
              error
            );
          });
        resolve(viewer);
      }
    );
  });
}

function ensureStringField(name, value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${name} query parameter is required. Please check the URL and try again.`);
  }
  if (typeof value !== "string") {
    throw new Error(`${name} query parameter must be a string. Please check the URL and try again.`);
  }
  return trimmed;
}

function ensureValidUuidField(name, value) {
  const trimmed = ensureStringField(name, value);
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
    throw new Error(`${name} query parameter must be a valid UUID. Please check the URL and try again.`);
  }
  return trimmed;
}

export function createProductReleaseData({
  productId,
  releaseId,
  accessId,
  accessType,
}) {
  return {
    productId: ensureValidUuidField(productIdQueryParam, productId),
    releaseId: ensureValidUuidField(releaseIdQueryParam, releaseId),
    accessId: ensureStringField(accessIdQueryParam, accessId),
    accessType: ensureStringField(accessTypeQueryParam, accessType),
  };
}

export async function loadModel(extension, productReleaseInput) {
  const productReleaseData = createProductReleaseData(productReleaseInput);
  extension.setProductReleaseDataToFetch(productReleaseData);
  extension.fetchProductRelease();
  extension.loadProductReleaseDefaultVariantSVF();
}
