const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const response = await fetch("./data/data.json"); // Загрузка JSON-файла
const jsonData = await response.json();

var createScene = function () {
  const scene = new BABYLON.Scene(engine);
  scene.debugLayer.show(); //мониторинг сцены
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

  let wrapper = new BABYLON.TransformNode("Wrapper");
  wrapper.setEnabled(true);
  wrapper.accessibilityTag = {
    description: "Scene",
  };

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
    //если роль - ученый
    ...jsonData.persons
      .filter((person) => person.role === "Ученый")
      .map((person) => ({
        model: "./models/science.obj",
        name: person.name,
        type: person.type,
        role: person.role,
        url: person.url,
      })),
    //Если роль не ученый
    ...jsonData.persons
      .filter((person) => person.role != "Ученый")
      .map((person) => ({
        model: "./models/person.obj",
        name: person.name,
        type: person.type,
        role: person.role,
        url: person.url,
      })),

    // Организации
    ...jsonData.organizations.map((organization) => ({
      model: "./models/organization.obj",
      name: organization.name,
      type: organization.type,
      role: organization.role,
      url: organization.url,
    })),

    // Сообщества
    ...jsonData.communities.map((community) => ({
      model: "./models/map.obj",
      name: community.name,
      type: community.type,
      role: community.role,
      url: community.url,
    })),
  ];
  // Функция для перемешивания массива
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  shuffleArray(allObjects);

  console.log(allObjects);

  // GUI для текста
  const advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

  //Отрисовка карточки над концептом
  const createLabel = async (name, position) => {
    try {
      const plane = BABYLON.MeshBuilder.CreatePlane(
        "labelPlane",
        { width: 1, height: 0.6 },
        scene
      );
      plane.parent = wrapper;
      plane.position = position.clone();
      plane.position.y += 1.2;
      plane.position.z -= 0.2;
      plane.rotation = new BABYLON.Vector3(0, Math.PI, 0);

      const material = new BABYLON.StandardMaterial("labelMaterial", scene);

      const textureWidth = 512;
      const textureHeight = 256;
      const dynamicTexture = new BABYLON.DynamicTexture(
        "dynamicTexture",
        { width: textureWidth, height: textureHeight },
        scene,
        true
      );

      material.diffuseColor = new BABYLON.Color3(255, 255, 255);

      plane.material = material;
      material.diffuseTexture = dynamicTexture;
      material.backFaceCulling = false;
      plane.material = material;
      plane.background = "white";

      // Отрисовка текста
      const ctx = dynamicTexture.getContext();
      ctx.clearRect(0, 0, textureWidth, textureHeight);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, textureWidth, textureHeight);

      ctx.font = "bold 45px Arial";
      ctx.fillStyle = "rgb(0,68,255)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxWidth = textureWidth - 20;
      const lineHeight = 55;
      let lines = [];
      let currentLine = "";

      // Разбиение текста на строки
      name.split(" ").forEach((word) => {
        const testLine = currentLine ? currentLine + " " + word : word;
        const width = ctx.measureText(testLine).width;

        if (width < maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      // Отрисовка текста
      const totalHeight = lines.length * lineHeight;
      const yStart = (textureHeight - totalHeight) / 1.5;

      // Рисуем все строки текста
      lines.forEach((line, index) => {
        ctx.fillText(line, textureWidth / 2, yStart + index * lineHeight);
      });

      dynamicTexture.update();

      return plane;
    } catch (error) {
      console.error("Ошибка создания метки:", error);
      return null;
    }
  };

  const createObject = async (
    modelName,
    name,
    positionX,
    positionY,
    type,
    role,
    url
  ) => {
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
        mesh.parent = wrapper;
        mesh.position = new BABYLON.Vector3(positionX, positionY, 0);

        createLabel(name, mesh.position);

        mesh.isPickable = true;
        mesh.originalMaterial = mesh.material;

        mesh.actionManager = new BABYLON.ActionManager(scene);

        // Создание карточки
        const card = createConceptCard(name, type, role, url);

        // Отображение карточки концепта при нажатии
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
              wrapper.setEnabled(false);
              card.setEnabled(true);
            }
          )
        );

        // Поднятие при наведении
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            function () {
              mesh.position.y += 0.05;
            }
          )
        );

        // Вернуть обратно
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
  let positionY = -2.4;
  const maxItemsPerShelf = 5;
  let itemsOnCurrentShelf = 0;

  //отрисовка полки
  const createShelf = (positionY) => {
    const shelf = BABYLON.MeshBuilder.CreateBox(
      "shelf",
      { height: 0.05, width: 6, depth: 0.5 },
      scene
    );
    shelf.parent = wrapper;
    shelf.position.y = positionY;

    const shelfMaterial = new BABYLON.StandardMaterial("shelfMaterial", scene);
    shelfMaterial.diffuseColor = new BABYLON.Color3(0, 68 / 255, 255 / 255);

    shelf.material = shelfMaterial;
    return shelf;
  };

  createShelf(positionY);

  (async () => {
    for (const object of allObjects) {
      if (itemsOnCurrentShelf >= maxItemsPerShelf) {
        positionY += 1.8;
        createShelf(positionY);
        positionX = -2.5;
        itemsOnCurrentShelf = 0;
      }

      await createObject(
        object.model,
        object.name,
        positionX,
        positionY,
        object.type,
        object.role,
        object.url
      );
      positionX += 1.2;
      itemsOnCurrentShelf += 1;
    }
  })();

  const createConceptCard = (name, type, role, url) => {
    let card = BABYLON.MeshBuilder.CreatePlane("card", { size: 5 });
    card.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    card.setEnabled(false);

    let adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(card);

    let wrapFront = new BABYLON.GUI.Rectangle("Card_wrapFront");
    wrapFront.width = "100%";
    wrapFront.background = "white";
    adt.addControl(wrapFront);

    let thumbnailBg = new BABYLON.GUI.Rectangle("Card_ThumbnailBg");
    thumbnailBg.accessibilityTag = {
      description: "Event card",
    };
    thumbnailBg.width = "100%";
    thumbnailBg.height = "40%";
    thumbnailBg.background = "white";
    thumbnailBg.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    thumbnailBg.top = 10;
    thumbnailBg.right = 100;
    wrapFront.addControl(thumbnailBg);

    let ConceptPhoto = new BABYLON.GUI.Image("Card_ThumbnailImage", url);
    ConceptPhoto.width = "50%";
    ConceptPhoto.height = "100%";
    ConceptPhoto.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    thumbnailBg.addControl(ConceptPhoto);

    const ConceptName = new BABYLON.GUI.TextBlock(
      "ConceptName",
      `Концепт: ${name}`
    );
    ConceptName.fontSize = 33;
    ConceptName.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    ConceptName.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    ConceptName.right = "5%";
    ConceptName.top = "120px";
    ConceptName.height = "5%";
    ConceptName.paddingLeft = "550px";
    wrapFront.addControl(ConceptName);

    const ConceptType = new BABYLON.GUI.TextBlock(
      "ConceptType",
      `Тип концепта: ${type}`
    );
    ConceptType.fontSize = 33;
    ConceptType.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    ConceptType.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    ConceptType.right = "5%";
    ConceptType.top = "180px";
    ConceptType.height = "5%";
    ConceptType.paddingLeft = "550px";
    wrapFront.addControl(ConceptType);

    const ConceptRole = new BABYLON.GUI.TextBlock(
      "ConceptRole",
      `Деятельность: ${role}`
    );
    ConceptRole.fontSize = 33;
    ConceptRole.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    ConceptRole.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    ConceptRole.right = "5%";
    ConceptRole.top = "240px";
    ConceptRole.height = "5%";
    ConceptRole.paddingLeft = "550px";
    wrapFront.addControl(ConceptRole);

    let closeButton = BABYLON.GUI.Button.CreateSimpleButton("Card_Close", "X");
    closeButton.accessibilityTag = {
      description: "close",
    };
    closeButton.background = "black";
    closeButton.color = "white";
    closeButton.fontSize = 40;
    closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    closeButton.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    closeButton.top = "0";
    closeButton.height = "5%";
    closeButton.width = "5%";
    wrapFront.addControl(closeButton);
    closeButton.onPointerClickObservable.add(() => {
      card.setEnabled(false);
      wrapper.setEnabled(true);
    });

    return card;
  };

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
