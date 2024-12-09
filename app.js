const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const response = await fetch("./data/data.json");
const jsonData = await response.json();

var createScene = async function () {
  const scene = new BABYLON.Scene(engine);
  // scene.debugLayer.show();
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  const nover_sound = new BABYLON.Sound("hover", "sounds/hover.mp3", scene); //звук при наведении на концепт
  const click_sound = new BABYLON.Sound("click", "sounds/click.mp3", scene); //звук при нажатии на концепт

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

  // // Дефолтное окружение
  // var environment = scene.createDefaultEnvironment({
  //   enableGroundShadow: true,
  //   groundYBias: -100,
  // });
  // environment.setMainColor(BABYLON.Color3.FromHexString("#000000"));
  // environment.ground.isVisible = false;
  // environment.skybox.isVisible = false;

  const xrHelper = await scene.createDefaultXRExperienceAsync({
    // floorMeshes: [environment.ground],
  });
  //Сфера
  BABYLON.SceneLoader.ImportMesh(
    "",
    "https://gikostandi.github.io/",
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
    "https://gikostandi.github.io/",
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
    ...jsonData.educations.map((educations) => ({
      model: "./models/education/education.obj",
      id: educations.id,
      name: educations.name,
      photo_properties: educations.photo_properties,
      photo_connections: educations.photo_connections,
      connections: educations.connections,
    })),
    //Персона
    ...jsonData.persons.map((persons) => ({
      model: "./models/person/person.obj",
      id: persons.id,
      name: persons.name,
      photo_properties: persons.photo_properties,
      photo_connections: persons.photo_connections,
      connections: persons.connections,
    })),
    //Организации
    ...jsonData.organizations.map((organizations) => ({
      model: "./models/organization/organization.obj",
      id: organizations.id,
      name: organizations.name,
      photo_properties: organizations.photo_properties,
      photo_connections: organizations.photo_connections,
      connections: organizations.connections,
    })),
    //Страна
    ...jsonData.countries.map((countries) => ({
      model: "./models/country/map.obj",
      id: countries.id,
      name: countries.name,
      photo_properties: countries.photo_properties,
      photo_connections: countries.photo_connections,
      connections: countries.connections,
    })),
    //Публикации
    ...jsonData.publications.map((publications) => ({
      model: "./models/publication/publication.obj",
      id: publications.id,
      name: publications.name,
      photo_properties: publications.photo_properties,
      photo_connections: publications.photo_connections,
      connections: publications.connections,
    })),
  ];
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  shuffleArray(allObjects);
  console.log(allObjects);

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
        "https://gikostandi.github.io/",
        modelName,
        scene
      );
      // Загрузка двух моделей внутри этой функции
      const card_properties = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "https://gikostandi.github.io/",
        photo_properties,
        scene
      );
      const card_connections = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "https://gikostandi.github.io/",
        photo_connections,
        scene
      );
      if (card_properties.meshes.length > 0) {
        card_properties.meshes.forEach((mesh) => {
          // mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
          mesh.setEnabled(false);
        });
      }

      if (card_connections.meshes.length > 0) {
        card_connections.meshes.forEach((mesh) => {
          // mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
          mesh.setEnabled(false);
        });
      }

      if (result.meshes.length > 0) {
        const mesh = result.meshes[0];
        mesh.parent = wrapper;
        mesh.position = new BABYLON.Vector3(positionX, positionY, 0);

        createLabel(name, mesh.position);

        mesh.isPickable = true;
        mesh.originalMaterial = mesh.material;

        mesh.actionManager = new BABYLON.ActionManager(scene);

        objectsMap[id] = mesh;

        //Карточка концепта при нажатии
        mesh.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
              click_sound.play();
              wrapper.setEnabled(false);
              createConceptCard(card_properties, card_connections);
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
                  ...(connections.countries || []),
                  ...(connections.publications || []),
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

  const createConceptCard = async (card_properties, card_connections) => {
    if (
      card_properties &&
      card_properties.meshes.length > 0 &&
      card_connections &&
      card_connections.meshes.length > 0
    ) {
      const mesh1 = card_properties.meshes[0];
      const mesh2 = card_connections.meshes[0];
      mesh1.setEnabled(true);
      mesh2.setEnabled(false);

      mesh1.position = new BABYLON.Vector3(0, 0, 1);
      mesh2.position = new BABYLON.Vector3(0, 0, 1);

      var manager = new BABYLON.GUI.GUI3DManager(scene);
      //Главная панель
      var mainPanel = new BABYLON.GUI.StackPanel3D();
      mainPanel.margin = 0.2;
      manager.addControl(mainPanel);
      mainPanel.position.y = 1.5;
      mainPanel.position.x = 5.2;
      mainPanel.position.z = 1;
      mainPanel.isVertical = true;
      // панель для кнопки скрыть
      var closePanel = new BABYLON.GUI.StackPanel3D();
      closePanel.margin = 0.2;
      manager.addControl(closePanel);
      closePanel.position.y = 3.1;
      closePanel.position.x = -5.2;
      closePanel.position.z = 1;
      closePanel.isVertical = true;

      const create3DButton = (
        action,
        targetPanel,
        buttonColor,
        imageUrl,
        scaleX,
        scaleY,
        scaleZ
      ) => {
        var button = new BABYLON.GUI.HolographicButton("button");
        targetPanel.addControl(button);
        button.onPointerUpObservable.add(action);
        button.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        button.mesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);

        var material = new BABYLON.StandardMaterial("buttonMaterial", scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(buttonColor);
        button.mesh.material = material;

        button.imageUrl = imageUrl;
      };

      create3DButton(
        () => {
          mesh1.setEnabled(false);
          mesh2.setEnabled(true);
        },
        mainPanel,
        "#035ba9",
        "https://gikostandi.github.io/icons/Связи.png",
        1,
        2,
        1
      );

      create3DButton(
        () => {
          mesh1.setEnabled(true);
          mesh2.setEnabled(false);
        },
        mainPanel,
        "#035ba9",
        "https://gikostandi.github.io/icons/Характеристики.png",
        1,
        2,
        1
      );

      create3DButton(
        () => {
          mesh1.setEnabled(false);
          mesh2.setEnabled(false);
          wrapper.setEnabled(true);
          mainPanel.children.forEach((button) => {
            button.isVisible = false;
          });
          closePanel.children.forEach((button) => {
            button.isVisible = false;
          });
        },
        closePanel,
        "#FF5733",
        "https://gikostandi.github.io/icons/close.png",
        1,
        1,
        1
      );
    } else {
      console.error("Не удалось загрузить модели");
    }
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
