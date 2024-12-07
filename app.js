const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const response = await fetch("./data/data.json");
const jsonData = await response.json();

var createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  scene.debugLayer.show();
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const nover_sound = new BABYLON.Sound("hover", "sounds/hover.mp3", scene); //звук при наведении на концепт
  const click_sound = new BABYLON.Sound("click", "sounds/click.mp3", scene); //звук при наведении на концепт

  const camera = new BABYLON.ArcRotateCamera(
    "Camera",
    Math.PI / 2,
    Math.PI / 2,
    5,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);

  const pointLight = new BABYLON.PointLight(
    "pointLight",
    new BABYLON.Vector3(0, 10, 0),
    scene
  );

  pointLight.intensity = 0.2;
  pointLight.diffuse = new BABYLON.Color3(1, 1, 1);
  pointLight.specular = new BABYLON.Color3(1, 1, 1);

  // Свет
  const light1 = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
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

  const xrHelper = await scene.createDefaultXRExperienceAsync({
    floorMeshes: [environment.ground],
  });
  //Сфера
  BABYLON.SceneLoader.ImportMesh(
    "",
    "https://localhost:5500/Talisman_VR/",
    "./models/sphere_background/sphere_background.obj",
    scene,
    function (meshes) {
      var skySphere = meshes[0];
      skySphere.scaling = new BABYLON.Vector3(10, 10, 10);
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
      skySphere.scaling = new BABYLON.Vector3(1, 1, 1);
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

  const allObjects = [
    //Образовательное учреждение
    ...jsonData.education.map((education) => ({
      model: "./models/education/education.obj",
      id: education.id,
      name: education.name,
      photo_properties: education.photo_properties,
      photo_connections: education.photo_connections,
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
      photo_properties: organization.photo_properties,
      photo_connections: organization.photo_connections,
      connections: organization.connections,
    })),
    //Страна
    ...jsonData.country.map((country) => ({
      model: "./models/country/map.obj",
      id: country.id,
      name: country.name,
      connections: country.connections,
    })),
    //Публикации
    ...jsonData.publication.map((publication) => ({
      model: "./models/publication/publication.obj",
      id: publication.id,
      name: publication.name,
      photo_properties: publication.photo_properties,
      photo_connections: publication.photo_connections,
      connections: publication.connections,
    })),
  ];
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  shuffleArray(allObjects);

  //Текст над концептом
  const createLabel = (name, position, scene) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(
      "labelPlane",
      { width: 1, height: 0.6 },
      scene
    );
    plane.position = position.clone();
    plane.position.y += 1.15;
    plane.position.z -= 0.2;
    plane.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    plane.parent = wrapper;

    const textureWidth = 512;
    const textureHeight = 256;
    const dynamicTexture = new BABYLON.DynamicTexture(
      "dynamicTexture",
      { width: textureWidth, height: textureHeight },
      scene,
      false
    );

    const ctx = dynamicTexture.getContext();
    ctx.clearRect(0, 0, textureWidth, textureHeight);

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, textureWidth, textureHeight);
    ctx.font = "italic bold 50px Arial";
    ctx.fillStyle = "rgb(0,68,255)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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

    dynamicTexture.update();

    const material = new BABYLON.StandardMaterial("labelMaterial", scene);
    material.diffuseTexture = dynamicTexture;
    material.opacityTexture = dynamicTexture;
    material.backFaceCulling = false;

    plane.material = material;

    return plane;
  };

  const objectsMap = {};

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

        objectsMap[id] = mesh;

        const card = createConceptCard(photo_properties, photo_connections);

        //Карточка концепта при нажатии
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
              click_sound.play();
              wrapper.setEnabled(false);
              card.setEnabled(true);
            }
          )
        );

        //анимация подпрыгивания
        const createBounceAnimation = (targetMesh) => {
          const bounceAnimation = new BABYLON.Animation(
            "bounceAnimation",
            "position.y",
            30, // FPS
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
          );

          const keys1 = [
            { frame: 0, value: targetMesh.position.y },
            { frame: 10, value: targetMesh.position.y + 0.1 },
            { frame: 20, value: targetMesh.position.y },
          ];

          bounceAnimation.setKeys(keys1);
          targetMesh.animations.push(bounceAnimation);
          scene.beginAnimation(targetMesh, 0, 20, true);
        };

        //возврат объекта на исходную позицию
        const createReturnAnimation = (targetMesh, originalY) => {
          const returnAnimation = new BABYLON.Animation(
            "returnAnimation",
            "position.y",
            30, // FPS
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
          );

          const keys2 = [
            { frame: 0, value: targetMesh.position.y },
            { frame: 10, value: originalY },
          ];

          returnAnimation.setKeys(keys2);
          targetMesh.animations.push(returnAnimation);
          scene.beginAnimation(targetMesh, 0, 10, false);
        };

        // Поднятие объекта и связанных объектов при наведении
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
              // createBounceAnimation(mesh);
              mesh.position.y += 0.07;
              nover_sound.play();
              if (!mesh.whiteMaterial) {
                const whiteMaterial = new BABYLON.StandardMaterial(
                  "whiteMaterial",
                  scene
                );
                whiteMaterial.diffuseColor = BABYLON.Color3.White();
                whiteMaterial.emissiveColor = BABYLON.Color3.White();
                mesh.whiteMaterial = whiteMaterial;
              }
              mesh.material = mesh.whiteMaterial;

              //зелёный материал для связанных объектов
              if (!scene.glowMaterial) {
                const glowMaterial = new BABYLON.StandardMaterial(
                  "glowMaterial",
                  scene
                );
                glowMaterial.emissiveColor = BABYLON.Color3.Green();
                glowMaterial.diffuseColor = BABYLON.Color3.Black();
                scene.glowMaterial = glowMaterial;

                scene.registerBeforeRender(() => {
                  const time = performance.now() * 0.005;
                  const glowIntensity = (Math.sin(time) + 1) / 2;
                  glowMaterial.emissiveColor = BABYLON.Color3.Lerp(
                    BABYLON.Color3.Green(),
                    BABYLON.Color3.White(),
                    glowIntensity
                  );
                });
              }

              if (connections) {
                const connectedIds = [
                  ...(connections.persons || []),
                  ...(connections.organizations || []),
                  ...(connections.communities || []),
                ];
                connectedIds.forEach((connectedId) => {
                  const connectedMesh = objectsMap[connectedId];
                  if (connectedMesh) {
                    createBounceAnimation(connectedMesh);
                    connectedMesh.originalMaterial = connectedMesh.material;
                    connectedMesh.material = scene.glowMaterial;
                    if (!connectedMesh.originalY) {
                      connectedMesh.originalY = connectedMesh.position.y;
                    }
                  }
                });
              }
            }
          )
        );

        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
              // scene.stopAnimation(mesh);
              // createReturnAnimation(mesh, positionY);
              mesh.position.y -= 0.07;
              mesh.material = mesh.originalMaterial;
              if (connections) {
                const connectedIds = [
                  ...(connections.persons || []),
                  ...(connections.organizations || []),
                  ...(connections.communities || []),
                ];
                connectedIds.forEach((connectedId) => {
                  const connectedMesh = objectsMap[connectedId];
                  if (connectedMesh) {
                    scene.stopAnimation(connectedMesh);
                    if (connectedMesh.originalY !== undefined) {
                      createReturnAnimation(
                        connectedMesh,
                        connectedMesh.originalY
                      );
                    }
                    connectedMesh.material = connectedMesh.originalMaterial;
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

  let positionX = -3;
  let positionY = -1.5;
  const maxItemsPerShelf = 6;
  let itemsOnCurrentShelf = 0;

  //отрисовка полки
  const createShelf = (positionY) => {
    const shelf = BABYLON.MeshBuilder.CreateBox(
      "shelf",
      { height: 0.04, width: 7, depth: 0.5 },
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
    shelfMaterial.alpha = 0.6;
    shelf.material = shelfMaterial;

    return shelf;
  };

  createShelf(positionY);

  (async () => {
    for (const object of allObjects) {
      if (itemsOnCurrentShelf >= maxItemsPerShelf) {
        positionY += 1.8;
        createShelf(positionY);
        positionX = -3;
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
      positionX += 1.2;
      itemsOnCurrentShelf += 1;
    }
  })();

  //Переделать (2 модели для каждого концепта)
  const createConceptCard = (photo_properties, photo_connections) => {
    const imageWidth = 1920;
    const imageHeight = 1080;

    const aspectRatio = imageWidth / imageHeight;
    const desiredHeight = 8;
    const desiredWidth = desiredHeight * aspectRatio;

    let card = BABYLON.MeshBuilder.CreatePlane("card", {
      width: desiredWidth,
      height: desiredHeight,
    });
    card.position.z = -2;
    card.position.y = 0;
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
      click_sound.play();
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
      click_sound.play();
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
      click_sound.play();
      photoProperties.isVisible = false;
      photoConnections.isVisible = true;
    });
    return card;
  };

  return scene;
};

(async () => {
  const scene = await createScene();

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
})();