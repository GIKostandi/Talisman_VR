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

  // Создаём точечный свет, который рассеивается во все стороны
  const pointLight = new BABYLON.PointLight(
    "pointLight",
    new BABYLON.Vector3(0, 10, 0), // Позиция источника света
    scene
  );

  // Настраиваем свойства света
  pointLight.intensity = 1; // Яркость света
  pointLight.diffuse = new BABYLON.Color3(1, 1, 1); // Цвет рассеянного света
  pointLight.specular = new BABYLON.Color3(1, 1, 1); // Цвет бликов

  // Свет
  const light1 = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(1, 1, 0),
    scene
  );
  // Свет
  const light2 = new BABYLON.HemisphericLight(
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

  //Сфера
  BABYLON.SceneLoader.ImportMesh(
    "",
    "https://localhost:5500/Talisman_VR/",
    "./models/sphere_background/sphere_background.obj",
    scene,
    function (meshes) {
      var skySphere = meshes[0];
      skySphere.scaling = new BABYLON.Vector3(10, 10, 10); //размер
      skySphere.isPickable = false;
    }
  );
  //Логотип талисмана
  BABYLON.SceneLoader.ImportMesh(
    "",
    "https://localhost:5500/Talisman_VR/",
    "./models/logo/logo.obj",
    scene,
    function (meshes) {
      var skySphere = meshes[0];
      skySphere.scaling = new BABYLON.Vector3(1, 1, 1); //размер
      skySphere.isPickable = false;
    }
  );

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
    //Образовательное учреждение
    ...jsonData.education.map((education) => ({
      model: "./models/education/education.obj",
      id: education.id,
      name: education.name,
      type: education.type,
      role: education.role,
      url: education.url,
      connections: education.connections,
    })),
    //Персона
    ...jsonData.persons.map((person) => ({
      model: "./models/person/person.obj",
      id: person.id,
      name: person.name,
      photo_properties: person.photo_properties,
      photo_connections: person.photo_connections,
      connections: person.connections,
    })),
    //Организации
    ...jsonData.organizations.map((organization) => ({
      model: "./models/organization/organization.obj",
      id: organization.id,
      name: organization.name,
      connections: organization.connections,
    })),
    //Сообщества
    ...jsonData.country.map((country) => ({
      model: "./models/country/map.obj",
      id: country.id,
      name: country.name,
      connections: country.connections,
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

  const createLabel = (name, position, scene) => {
    // Создаем плоскость для отображения текста
    const plane = BABYLON.MeshBuilder.CreatePlane(
      "labelPlane",
      { width: 1, height: 0.6 },
      scene
    );
    plane.position = position.clone();
    plane.position.y += 1.15; // Поднять текст над объектом
    plane.position.z -= 0.2;
    plane.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    plane.parent = wrapper;

    // Создаем динамическую текстуру
    const textureWidth = 512;
    const textureHeight = 256;
    const dynamicTexture = new BABYLON.DynamicTexture(
      "dynamicTexture",
      { width: textureWidth, height: textureHeight },
      scene,
      false
    );

    // Получаем контекст для рисования текста
    const ctx = dynamicTexture.getContext();
    ctx.clearRect(0, 0, textureWidth, textureHeight);

    // Настройки текста
    ctx.fillStyle = "transparent"; // Прозрачный фон
    ctx.fillRect(0, 0, textureWidth, textureHeight);
    ctx.font = "italic bold 50px Arial";
    ctx.fillStyle = "rgb(0,68,255)"; // Цвет текста
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Логика разбиения текста на строки
    const maxWidth = textureWidth - 20;
    const lineHeight = 55;
    const lines = [];
    let currentLine = "";

    name.split(" ").forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
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

    lines.forEach((line, index) => {
      ctx.fillText(line, textureWidth / 2, yStart + index * lineHeight);
    });

    // Обновляем текстуру
    dynamicTexture.update();

    // Применяем текстуру на материал и присваиваем плоскости
    const material = new BABYLON.StandardMaterial("labelMaterial", scene);
    material.diffuseTexture = dynamicTexture;
    material.opacityTexture = dynamicTexture; // Поддержка прозрачности
    material.backFaceCulling = false;

    plane.material = material;

    return plane;
  };

  // Хранилище для всех созданных мешей
  const objectsMap = {};

  // Функция для создания объекта
  const createObject = async (
    modelName,
    id,
    name,
    positionX,
    positionY,
    photo_properties,
    photo_connections,
    connections
  ) => {
    try {
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

        // Сохранение объекта в хранилище
        objectsMap[id] = mesh;

        // Создание карточки
        const card = createConceptCard(photo_properties, photo_connections);

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

        // Поднятие объекта и связанных объектов при наведении
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
              // Поднять текущий объект
              mesh.position.y += 0.07;

              // Поднять связанные объекты
              if (connections) {
                const connectedIds = [
                  ...(connections.persons || []),
                  ...(connections.organizations || []),
                  ...(connections.communities || []),
                ];
                console.log(connectedIds);
                connectedIds.forEach((connectedId) => {
                  const connectedMesh = objectsMap[connectedId];
                  if (connectedMesh) {
                    connectedMesh.position.y += 0.07;
                  }
                });
              }
            }
          )
        );

        // Вернуть объекты на место при выходе мыши
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
              // Вернуть текущий объект
              mesh.position.y -= 0.07;

              // Вернуть связанные объекты
              if (connections) {
                const connectedIds = [
                  ...(connections.persons || []),
                  ...(connections.organizations || []),
                  ...(connections.communities || []),
                ];
                connectedIds.forEach((connectedId) => {
                  const connectedMesh = objectsMap[connectedId];
                  if (connectedMesh) {
                    connectedMesh.position.y -= 0.07;
                  }
                });
              }
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
    shelfMaterial.diffuseColor = new BABYLON.Color3(
      53 / 255,
      125 / 255,
      218 / 255
    );
    shelfMaterial.alpha = 0.6; // Устанавливаем прозрачность материала
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
        object.id,
        object.name,
        positionX,
        positionY,
        object.photo_properties,
        object.photo_connections,
        object.connections
      );
      console.log(createObject);
      positionX += 1.2;
      itemsOnCurrentShelf += 1;
    }
  })();

  const createConceptCard = (photo_properties, photo_connections) => {
    // Размеры картинки
    const imageWidth = 1003;
    const imageHeight = 1621;

    // Вычисляем соотношение сторон
    const aspectRatio = imageWidth / imageHeight;

    // Определяем желаемую высоту или ширину плоскости
    const desiredHeight = 5; // Например, высота 10 единиц
    const desiredWidth = desiredHeight * aspectRatio;

    // Создаем плоскость с заданными размерами
    let card = BABYLON.MeshBuilder.CreatePlane("card", {
      width: desiredWidth,
      height: desiredHeight,
    });
    // let card = BABYLON.MeshBuilder.CreatePlane("card", { size: 10 });
    card.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    card.setEnabled(false);

    let adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(card);

    let wrapFront = new BABYLON.GUI.Rectangle("Card_wrapFront");
    wrapFront.width = "100%";
    wrapFront.background = "white";
    adt.addControl(wrapFront);

    //Фотка со связями
    let photoConnections = new BABYLON.GUI.Image(
      "Card_ThumbnailImage",
      photo_connections
    );
    photoConnections.width = "100%";
    photoConnections.height = "100%";
    photoConnections.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    wrapFront.addControl(photoConnections);

    //Фотка с характеристиками
    let photoProperties = new BABYLON.GUI.Image(
      "Card_ThumbnailImage",
      photo_properties
    );
    photoProperties.width = "100%";
    photoProperties.height = "100%";
    photoProperties.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    wrapFront.addControl(photoProperties);

    //кнопка закрытия карточки
    let closeButton = BABYLON.GUI.Button.CreateSimpleButton("Card_Close", "X");
    closeButton.background = "black";
    closeButton.color = "white";
    closeButton.fontSize = 40;
    closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    closeButton.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    closeButton.height = "5%";
    closeButton.width = "10%";
    wrapFront.addControl(closeButton);

    closeButton.onPointerClickObservable.add(() => {
      card.setEnabled(false);
      wrapper.setEnabled(true);
    });

    //кнопка переключения на характеристики
    let Properties_button = BABYLON.GUI.Button.CreateSimpleButton(
      "Card_properties",
      "Характеристики"
    );
    Properties_button.background = "rgb(0,68,255)";
    Properties_button.color = "white";
    Properties_button.fontSize = 40;
    Properties_button.verticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    Properties_button.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    Properties_button.top = "5%";
    Properties_button.height = "5%";
    Properties_button.width = "50%";
    wrapFront.addControl(Properties_button);

    Properties_button.onPointerClickObservable.add(() => {
      photoConnections.isVisible = false;
      photoProperties.isVisible = true;
    });

    //кнопка переключения на связи
    let connections_button = BABYLON.GUI.Button.CreateSimpleButton(
      "connections_button",
      "Связи"
    );
    connections_button.background = "rgb(0,68,255)";
    connections_button.color = "white";
    connections_button.fontSize = 40;
    connections_button.verticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    connections_button.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    connections_button.left = "50%";
    connections_button.top = "5%";
    connections_button.height = "5%";
    connections_button.width = "50%";
    wrapFront.addControl(connections_button);

    connections_button.onPointerClickObservable.add(() => {
      photoProperties.isVisible = false;
      photoConnections.isVisible = true;
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
