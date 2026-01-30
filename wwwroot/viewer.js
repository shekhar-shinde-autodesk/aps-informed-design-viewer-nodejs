/// import * as Autodesk from "@types/forge-viewer";

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
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} is required`);
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
    productId: ensureStringField("productId", productId),
    releaseId: ensureStringField("releaseId", releaseId),
    accessId: ensureStringField("accessId", accessId),
    accessType: ensureStringField("accessType", accessType),
  };
}

export async function loadModel(extension, productReleaseInput) {
  const productReleaseData = createProductReleaseData(productReleaseInput);
  extension.setProductReleaseDataToFetch(productReleaseData);
  await extension.fetchProductRelease();
  return extension.loadProductReleaseDefaultVariantSVF();
}
