const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const response = await fetch("./data/data.json"); // Загрузка JSON-файла
const jsonData = await response.json();

var createScene = function () {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Белый фон

  // Камера
  const camera = new BABYLON.ArcRotateCamera(
    "Camera",
    Math.PI / 2,
    Math.PI / 2,
    5,
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

  const allObjects = [
    ...jsonData.persons.map((person) => ({
      model: "./models/test.glb",
      name: person.name,
      type: "person",
    })),
    ...jsonData.organizations.map((organization) => ({
      model: "./models/organization.obj",
      name: organization.name,
      type: "organization",
    })),
    ...jsonData.communities.map((community) => ({
      model: "./models/map.obj",
      name: community.name,
      type: "community",
    })),
  ];

  // GUI для текста
  const advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  // Функции для объектов и текстов
  const createLabel = (name, position) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(
      "labelPlane",
      { size: 1 },
      scene
    );
    plane.position = position.clone();
    plane.position.y += 1.1;

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
    try {
      // Загрузка модели
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "https://localhost:5500/Talisman_VR/",
        modelName,
        scene
      );
      if (result.meshes.length > 0) {
        const mesh = result.meshes[0];
        mesh.position = new BABYLON.Vector3(positionX, positionY, 0);

        createLabel(name, mesh.position);

        mesh.isPickable = true;
        mesh.originalMaterial = mesh.material;

        mesh.actionManager = new BABYLON.ActionManager(scene);

        // При клике на объект
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            function () {
              alert(name);
            }
          )
        );

        //Поднитие при наведении
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            function () {
              mesh.position.y += 0.05;
            }
          )
        );

        //вернуть обратно
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            function () {
              mesh.position.y -= 0.05;
            }
          )
        );
      } else {
        console.error("Меши не загружены");
      }
    } catch (error) {
      console.error("Ошибка при загрузке модели:", error);
    }
  };

  // Обработка данных JSON
  let positionX = -2.5;
  let positionY = 0;
  const maxItemsPerShelf = 5;
  let itemsOnCurrentShelf = 0;

  const createShelf = (positionY) => {
    const shelf = BABYLON.MeshBuilder.CreateBox(
      "shelf",
      { height: 0.05, width: 6, depth: 0.5 },
      scene
    );
    shelf.position.y = positionY;

    const shelfMaterial = new BABYLON.StandardMaterial("shelfMaterial", scene);
    shelfMaterial.diffuseColor = new BABYLON.Color3.Blue();

    // Применение материала к полке
    shelf.material = shelfMaterial;
    return shelf;
  };

  createShelf(positionY);

  (async () => {
    for (const object of allObjects) {
      if (itemsOnCurrentShelf >= maxItemsPerShelf) {
        positionY += 1.3;
        createShelf(positionY);
        positionX = -2.5;
        itemsOnCurrentShelf = 0;
      }

      await createObject(object.model, object.name, positionX, positionY);
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
