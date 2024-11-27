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
      description: "Scene"
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
    ...jsonData.persons.map((person) => ({
      model: "./models/person.obj",
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
  console.log(allObjects);

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
    plane.parent=wrapper;
    plane.position = position.clone();
    plane.position.y += 1.1;

    plane.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    const dynamicTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
    dynamicTexture.parent=wrapper;

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
        mesh.parent=wrapper;
        mesh.position = new BABYLON.Vector3(positionX, positionY, 0);

        createLabel(name, mesh.position);

        mesh.isPickable = true;
        mesh.originalMaterial = mesh.material;

        mesh.actionManager = new BABYLON.ActionManager(scene);

        //Отображение карточки концепта при нажатии
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
              wrapper.setEnabled(false);
              card.setEnabled(true);
          })
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
    shelf.parent=wrapper;
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

  //Отрисовка карточки с данными о концепте (засунуть в функцию и вынести в отдельный файл)
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
      description: "Event card"
  };
  thumbnailBg.width = "100%";
  thumbnailBg.height = "40%";
  thumbnailBg.background = "white";
  thumbnailBg.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  thumbnailBg.top = 10;
  thumbnailBg.right = 100;
  wrapFront.addControl(thumbnailBg);

  let url = "https://upload.wikimedia.org/wikipedia/commons/8/80/Sofja_Wassiljewna_Kowalewskaja_1_%28Remini_enhanced%29.jpg";
  let ConceptPhoto = new BABYLON.GUI.Image("Card_ThumbnailImage", url);
  ConceptPhoto.width = "50%";
  ConceptPhoto.height = "100%";
  ConceptPhoto.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  thumbnailBg.addControl(ConceptPhoto);

  const ConceptName = new BABYLON.GUI.TextBlock("ConceptName", "Концепт: Софья Ковалевская");
  ConceptName.fontSize = 33;
  ConceptName.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  ConceptName.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  ConceptName.right = "5%"
  ConceptName.top = "120px";
  ConceptName.height = "5%";
  ConceptName.paddingLeft = "550px";
  wrapFront.addControl(ConceptName);

  const ConceptType = new BABYLON.GUI.TextBlock("ConceptType", "Тип концепта: Персона");
  ConceptType.fontSize = 33;
  ConceptType.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  ConceptType.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  ConceptType.right = "5%";
  ConceptType.top = "180px";
  ConceptType.height = "5%";
  ConceptType.paddingLeft = "550px";
  wrapFront.addControl(ConceptType);

  const ConceptRole = new BABYLON.GUI.TextBlock("Conceptrole", "Деятельность: Ученый");
  ConceptRole.fontSize = 33;
  ConceptRole.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  ConceptRole.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  ConceptRole.right = "5%";
  ConceptRole.top = "240px";
  ConceptRole.height = "5%";
  ConceptRole.paddingLeft = "550px";
  wrapFront.addControl(ConceptRole);

  let dateFront = new BABYLON.GUI.TextBlock("Card_Date", "Every day");
  wrapFront.addControl(dateFront);
  dateFront.fontSize = 40;
  dateFront.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  dateFront.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  dateFront.paddingLeft = "7.5%";
  dateFront.top = "50%";
  dateFront.height = "5%";
  dateFront.isEnabled = false;

  const timeFront = new BABYLON.GUI.TextBlock("Card_Time", "00:00 - 23:59");
  wrapFront.addControl(timeFront);
  timeFront.fontSize = 40;
  timeFront.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  timeFront.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  timeFront.paddingLeft = "35%";
  timeFront.top = "50%";
  timeFront.height = "5%";

  const meetingDetail = new BABYLON.GUI.TextBlock(
      "Card_GroupName",
      "Help the little bunny rabbits get ready for Easter! Look at all the different colors to decorate Easter eggs with and pick out the shapes you'd like to wear in the parade. "
  );
  wrapFront.addControl(meetingDetail);
  meetingDetail.fontSize = 40;
  meetingDetail.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  meetingDetail.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  meetingDetail.paddingLeft = "7.5%";
  meetingDetail.top = "55%";
  meetingDetail.height = "30%";
  meetingDetail.width = "100%";
  meetingDetail.textWrapping = BABYLON.GUI.TextWrapping.WordWrapEllipsis;


  let closeButton = BABYLON.GUI.Button.CreateSimpleButton("Card_Close", "X");
  closeButton.accessibilityTag = {
      description: "close",
  };
  closeButton.background = "black";
  closeButton.color = "white";
  closeButton.fontSize = 40;
  closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  closeButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  closeButton.textBlock.textHorizontalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  closeButton.top = "0";
  closeButton.height = "5%";
  closeButton.width = "5%";
  wrapFront.addControl(closeButton);
  closeButton.onPointerClickObservable.add(() => {
      card.setEnabled(false);
      wrapper.setEnabled(true);
  });

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
