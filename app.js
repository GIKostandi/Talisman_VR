const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const response = await fetch("./data/data.json"); // Загрузка JSON-файла
const jsonData = await response.json();

const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Белый фон

  // Камера
  const camera = new BABYLON.ArcRotateCamera(
    "Camera",
    Math.PI / 2,
    Math.PI / 4,
    10,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);

  // Свет
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(1, 1, 0),
    scene
  );

  // Дефолтное окружение
  var environment = scene.createDefaultEnvironment({
    enableGroundShadow: true,
    groundYBias: -100,
  });
  environment.setMainColor(BABYLON.Color3.FromHexString("#000000"));
  environment.ground.isVisible = false;
  environment.skybox.isVisible = false;

  // Для использования виара
  var vrHelper = scene.createDefaultVRExperience({
    createDeviceOrientationCamera: false,
    useXR: true,
  });

  // Создание скайбокса
  var skybox = BABYLON.Mesh.CreateBox("skyBox", 100.0, scene);
  var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
  skyboxMaterial.backFaceCulling = false;
  skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(
    "textures/skybox",
    scene
  );
  skyboxMaterial.reflectionTexture.coordinatesMode =
    BABYLON.Texture.SKYBOX_MODE;
  skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
  skyboxMaterial.disableLighting = true;
  skybox.material = skyboxMaterial;

  // Поле для телепортации
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    {
      width: 10,
      height: 10,
    },
    scene
  );
  ground.isVisible = false;
  vrHelper.enableTeleportation({ floorMeshes: [ground] });

  // GUI для текста
  const advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  //Переписать, временное решение. Babylon спокойно поддерживает обработчики из коробки без построения доп структуры с вложенными if
  // Создание подсветки
  const highlightMaterial = new BABYLON.StandardMaterial(
    "highlightMaterial",
    scene
  );
  highlightMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0);

  let lastPickedMesh = null;

  const onPointerMove = (event) => {
    const pickResult = scene.pick(scene.pointerX, scene.pointerY);

    if (pickResult.pickedMesh && pickResult.pickedMesh.isPickable) {
      const pickedMesh = pickResult.pickedMesh;

      if (
        !pickedMesh.name.includes("skyBox") &&
        !pickedMesh.name.includes("labelPlane") &&
        !pickedMesh.name.includes("shelf")
      ) {
        if (lastPickedMesh !== pickedMesh) {
          if (lastPickedMesh && lastPickedMesh.originalMaterial) {
            lastPickedMesh.material = lastPickedMesh.originalMaterial;
          }

          pickedMesh.originalMaterial = pickedMesh.material;
          pickedMesh.material = highlightMaterial;

          lastPickedMesh = pickedMesh;
        }
      }
    } else {
      if (lastPickedMesh && lastPickedMesh.material) {
        lastPickedMesh.material = lastPickedMesh.originalMaterial;
        lastPickedMesh = null;
      }
    }
  };

  scene.onPointerMove = onPointerMove;

  // Функции для объектов и текстов
  const createLabel = (name, position) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(
      "labelPlane",
      { size: 1 },
      scene
    );
    plane.position = position.clone();
    plane.position.y += 0.6;

    plane.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    const dynamicTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);

    const textBlock = new BABYLON.GUI.TextBlock();
    textBlock.text = name;
    textBlock.color = "black";
    textBlock.fontSize = 100;
    dynamicTexture.addControl(textBlock);

    return plane;
  };

  const createObject = async (modelName, name, positionX, positionY) => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "https://localhost:5500/Talisman_VR/",
      modelName,
      scene
    );
    const mesh = result.meshes[0];
    mesh.position = new BABYLON.Vector3(positionX, positionY, 0);
    mesh.isPickable = true;
    mesh.originalMaterial = mesh.material;

    createLabel(name, mesh.position);
  };

  // Обработка данных JSON
  let positionX = -2.5;
  let positionY = 0;
  const maxItemsPerShelf = 5;
  let itemsOnCurrentShelf = 0;

  const createShelf = (positionY) => {
    const shelf = BABYLON.MeshBuilder.CreateBox(
      "shelf",
      { height: 0.1, width: 6, depth: 0.5 },
      scene
    );
    shelf.position.y = positionY;
    return shelf;
  };

  createShelf(positionY);

  const allObjects = [
    ...jsonData.persons.map((person) => ({
      model: "./models/person.glb",
      name: person.name,
      type: "person",
    })),
    ...jsonData.organizations.map((organization) => ({
      model: "./models/organization.glb",
      name: organization.name,
      type: "organization",
    })),
    ...jsonData.communities.map((community) => ({
      model: "./models/map.glb",
      name: community.name,
      type: "community",
    })),
  ];

  (async () => {
    for (const object of allObjects) {
      if (itemsOnCurrentShelf >= maxItemsPerShelf) {
        positionY += 1.3;
        createShelf(positionY);
        positionX = -2.5;
        itemsOnCurrentShelf = 0;
      }

      await createObject(
        object.model,
        object.name,
        positionX,
        positionY + 0.47
      );
      positionX += 1.2;
      itemsOnCurrentShelf += 1;
    }
  })();

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
