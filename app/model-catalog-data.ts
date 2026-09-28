export type CatalogModel = {
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  material: string;
  image?: string;
  model: string;
};

export type CatalogModelFormat = "STL" | "STEP";

export function catalogModelFormat(model: Pick<CatalogModel, "model">): CatalogModelFormat {
  return /\.(?:step|stp)(?:$|[?#])/i.test(model.model) ? "STEP" : "STL";
}

export const catalogModels: readonly CatalogModel[] = [
  {
    "slug": "registrator",
    "name": "Корпус регистратора",
    "description": "Корпус и элементы регистратора, подготовленные для просмотра, проверки конструкции и изготовления.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / ABS",
    "model": "/models/registrator.stp"
  },
  {
    "slug": "gusenitsa-ekskavatora",
    "name": "Гусеница для модели экскаватора",
    "description": "Звено гусеницы экскаватора для просмотра конструкции, прототипирования или изготовления макета.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "model": "/models/gusenitsa-ekskavatora.stp"
  },
  {
    "slug": "meshy-ai-model",
    "name": "Фигурка кошки",
    "description": "Декоративная фигурка кошки, подготовленная по изображению и адаптированная для 3D-печати.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG",
    "model": "/models/meshy-ai-model.stl"
  },
  {
    "slug": "vint",
    "name": "Винт с внутренним шестигранником",
    "description": "Резьбовая крепёжная деталь для замены или изготовления под конкретные размеры.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "model": "/models/vint.stl"
  },
  {
    "slug": "stupichnaya-gayka",
    "name": "Ступичная гайка",
    "description": "Техническая деталь сложной формы, подготовленная для изготовления по готовой 3D-модели.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "model": "/models/stupichnaya-gayka.stl"
  },
  {
    "slug": "zaglushka-4",
    "name": "Круглая заглушка",
    "description": "Функциональная заглушка для замены штатной детали или изготовления под нужные размеры.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "model": "/models/zaglushka-4.stl"
  },
  {
    "slug": "wow",
    "name": "Фигурка персонажа",
    "description": "Декоративная фигурка персонажа, подготовленная для просмотра и изготовления методом 3D-печати.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG",
    "model": "/models/wow.stl"
  },
  {
    "slug": "batareynyy-otsek",
    "name": "Батарейный отсек",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/batareynyy-otsek.jpg",
    "model": "/models/batareynyy-otsek.stl"
  },
  {
    "slug": "blender",
    "name": "Блендер",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/blender.jpg",
    "model": "/models/blender.stl"
  },
  {
    "slug": "blender-shesternya",
    "name": "блендер шестерня",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/blender-shesternya.jpg",
    "model": "/models/blender-shesternya.stl"
  },
  {
    "slug": "buldozer",
    "name": "Бульдозер",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/buldozer.jpg",
    "model": "/models/buldozer.stl"
  },
  {
    "slug": "derzhatel-dlya-lyzh",
    "name": "Держатель для лыж",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/derzhatel-dlya-lyzh.jpg",
    "model": "/models/derzhatel-dlya-lyzh.stl"
  },
  {
    "slug": "detal-1",
    "name": "Деталь 1",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/detal-1.jpg",
    "model": "/models/detal-1.stl"
  },
  {
    "slug": "detal-12",
    "name": "Деталь 12",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/detal-12.jpg",
    "model": "/models/detal-12.stl"
  },
  {
    "slug": "untitled",
    "name": "Деталь без названия",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/untitled.jpg",
    "model": "/models/untitled.stl"
  },
  {
    "slug": "2",
    "name": "Деталь корпуса",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/2.jpg",
    "model": "/models/2.stl"
  },
  {
    "slug": "detal-shester-553",
    "name": "деталь шестер 553",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/detal-shester-553.jpg",
    "model": "/models/detal-shester-553.stl"
  },
  {
    "slug": "detal-shester-553-malenkaya",
    "name": "деталь шестер 553 маленькая",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/detal-shester-553-malenkaya.jpg",
    "model": "/models/detal-shester-553-malenkaya.stl"
  },
  {
    "slug": "detal2",
    "name": "деталь2",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/detal2.jpg",
    "model": "/models/detal2.stl"
  },
  {
    "slug": "dushevaya",
    "name": "Душевая",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/dushevaya.jpg",
    "model": "/models/dushevaya.stl"
  },
  {
    "slug": "elka",
    "name": "Елка",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/elka.jpg",
    "model": "/models/elka.stl"
  },
  {
    "slug": "zaglushka",
    "name": "Заглушка",
    "description": "Заглушка — точная деталь на замену оригинальной. Подбирается по размерам.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/zaglushka.jpg",
    "model": "/models/zaglushka.stl"
  },
  {
    "slug": "zaglushka-eskalator",
    "name": "Заглушка эскалатор",
    "description": "Заглушка — точная деталь на замену оригинальной. Подбирается по размерам.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/zaglushka-eskalator.jpg",
    "model": "/models/zaglushka-eskalator.stl"
  },
  {
    "slug": "zaglushka3",
    "name": "Заглушка3",
    "description": "Заглушка — точная деталь на замену оригинальной. Подбирается по размерам.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/zaglushka3.jpg",
    "model": "/models/zaglushka3.stl"
  },
  {
    "slug": "zalivnaya-gorlovina",
    "name": "заливная горловина",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/zalivnaya-gorlovina.jpg",
    "model": "/models/zalivnaya-gorlovina.stl"
  },
  {
    "slug": "zashchelka-brp",
    "name": "Защелка BRP",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/zashchelka-brp.jpg",
    "model": "/models/zashchelka-brp.stl"
  },
  {
    "slug": "kerkher",
    "name": "Керхер",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kerkher.jpg",
    "model": "/models/kerkher.stl"
  },
  {
    "slug": "klipsa",
    "name": "Клипса",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/klipsa.jpg",
    "model": "/models/klipsa.stl"
  },
  {
    "slug": "klipsa1",
    "name": "Клипса1",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/klipsa1.jpg",
    "model": "/models/klipsa1.stl"
  },
  {
    "slug": "klipsa2",
    "name": "Клипса2",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/klipsa2.jpg",
    "model": "/models/klipsa2.stl"
  },
  {
    "slug": "kozhukh",
    "name": "Кожух",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kozhukh.jpg",
    "model": "/models/kozhukh.stl"
  },
  {
    "slug": "koleso",
    "name": "Колесо",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/koleso.jpg",
    "model": "/models/koleso.stl"
  },
  {
    "slug": "kolpak",
    "name": "колпак",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kolpak.jpg",
    "model": "/models/kolpak.stl"
  },
  {
    "slug": "kolpak-audi",
    "name": "Колпак AUDI",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kolpak-audi.jpg",
    "model": "/models/kolpak-audi.stl"
  },
  {
    "slug": "kolpak222",
    "name": "Колпак222",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kolpak222.jpg",
    "model": "/models/kolpak222.stl"
  },
  {
    "slug": "3",
    "name": "Корпусная деталь",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/3.jpg",
    "model": "/models/3.stl"
  },
  {
    "slug": "kosilka",
    "name": "Косилка",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kosilka.jpg",
    "model": "/models/kosilka.stl"
  },
  {
    "slug": "kofemashina",
    "name": "Кофемашина",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kofemashina.jpg",
    "model": "/models/kofemashina.stl"
  },
  {
    "slug": "krepezh",
    "name": "Крепеж",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh.jpg",
    "model": "/models/krepezh.stl"
  },
  {
    "slug": "krepezh-bardachka",
    "name": "Крепеж бардачка",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh-bardachka.jpg",
    "model": "/models/krepezh-bardachka.stl"
  },
  {
    "slug": "krepezh-lyzhi",
    "name": "Крепеж лыжи",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh-lyzhi.jpg",
    "model": "/models/krepezh-lyzhi.stl"
  },
  {
    "slug": "krepezh-plavnik",
    "name": "Крепеж плавник",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh-plavnik.jpg",
    "model": "/models/krepezh-plavnik.stl"
  },
  {
    "slug": "krepezh11",
    "name": "Крепеж11",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh11.jpg",
    "model": "/models/krepezh11.stl"
  },
  {
    "slug": "krepezh222",
    "name": "Крепеж222",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh222.jpg",
    "model": "/models/krepezh222.stl"
  },
  {
    "slug": "krepezh333",
    "name": "Крепеж333",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krepezh333.jpg",
    "model": "/models/krepezh333.stl"
  },
  {
    "slug": "kreplenie-antenny",
    "name": "Крепление антенны",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kreplenie-antenny.jpg",
    "model": "/models/kreplenie-antenny.stl"
  },
  {
    "slug": "kronshteyn-skyline",
    "name": "Кронштейн skyline",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kronshteyn-skyline.jpg",
    "model": "/models/kronshteyn-skyline.stl"
  },
  {
    "slug": "krylchatka-kofemashina",
    "name": "Крыльчатка кофемашина",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krylchatka-kofemashina.jpg",
    "model": "/models/krylchatka-kofemashina.stl"
  },
  {
    "slug": "krylchatka1",
    "name": "Крыльчатка1",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krylchatka1.jpg",
    "model": "/models/krylchatka1.stl"
  },
  {
    "slug": "krylchatka2",
    "name": "Крыльчатка2",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/krylchatka2.jpg",
    "model": "/models/krylchatka2.stl"
  },
  {
    "slug": "kryshka",
    "name": "Крышка",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kryshka.jpg",
    "model": "/models/kryshka.stl"
  },
  {
    "slug": "kryshka-ventilyatora",
    "name": "Крышка вентилятора",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/kryshka-ventilyatora.jpg",
    "model": "/models/kryshka-ventilyatora.stl"
  },
  {
    "slug": "lampochka",
    "name": "Лампочка",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/lampochka.jpg",
    "model": "/models/lampochka.stl"
  },
  {
    "slug": "lodka",
    "name": "Лодка",
    "description": "Деталь для хобби/спорта. Изготовлена под конкретную модель или задачу.",
    "price": 500,
    "category": "Хобби",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/lodka.jpg",
    "model": "/models/lodka.stl"
  },
  {
    "slug": "mikrovolnovka",
    "name": "Микроволновка",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/mikrovolnovka.jpg",
    "model": "/models/mikrovolnovka.stl"
  },
  {
    "slug": "mufta",
    "name": "Муфта",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/mufta.jpg",
    "model": "/models/mufta.stl"
  },
  {
    "slug": "myasorubka",
    "name": "Мясорубка",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/myasorubka.jpg",
    "model": "/models/myasorubka.stl"
  },
  {
    "slug": "nakladki",
    "name": "Накладки",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/nakladki.jpg",
    "model": "/models/nakladki.stl"
  },
  {
    "slug": "nozhka",
    "name": "ножка",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/nozhka.jpg",
    "model": "/models/nozhka.stl"
  },
  {
    "slug": "nozhka1",
    "name": "ножка1",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/nozhka1.jpg",
    "model": "/models/nozhka1.stl"
  },
  {
    "slug": "nozhki",
    "name": "Ножки",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/nozhki.jpg",
    "model": "/models/nozhki.stl"
  },
  {
    "slug": "bilyard",
    "name": "Плафон",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/bilyard.jpg",
    "model": "/models/bilyard.stl"
  },
  {
    "slug": "prizhimnaya",
    "name": "Прижимная",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/prizhimnaya.jpg",
    "model": "/models/prizhimnaya.stl"
  },
  {
    "slug": "prizhimnaya-lapka",
    "name": "Прижимная лапка",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/prizhimnaya-lapka.jpg",
    "model": "/models/prizhimnaya-lapka.stl"
  },
  {
    "slug": "rascheska",
    "name": "Расческа",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/rascheska.jpg",
    "model": "/models/rascheska.stl"
  },
  {
    "slug": "rezinka",
    "name": "Резинка",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/rezinka.jpg",
    "model": "/models/rezinka.stl"
  },
  {
    "slug": "remeshok",
    "name": "ремешок",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/remeshok.jpg",
    "model": "/models/remeshok.stl"
  },
  {
    "slug": "remeshok-2",
    "name": "ремешок 2",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/remeshok-2.jpg",
    "model": "/models/remeshok-2.stl"
  },
  {
    "slug": "reshetka-kholodilnika",
    "name": "Решетка холодильника",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/reshetka-kholodilnika.jpg",
    "model": "/models/reshetka-kholodilnika.stl"
  },
  {
    "slug": "sibagro",
    "name": "СибАгро",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/sibagro.jpg",
    "model": "/models/sibagro.stl"
  },
  {
    "slug": "sibagro2",
    "name": "Сибагро2",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/sibagro2.jpg",
    "model": "/models/sibagro2.stl"
  },
  {
    "slug": "smesitel",
    "name": "смеситель",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/smesitel.jpg",
    "model": "/models/smesitel.stl"
  },
  {
    "slug": "smesitel1",
    "name": "Смеситель1",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/smesitel1.jpg",
    "model": "/models/smesitel1.stl"
  },
  {
    "slug": "stomatolog",
    "name": "Стоматолог",
    "description": "Медицинская / ортопедическая деталь. Изготавливается по заказу.",
    "price": 500,
    "category": "Медицина",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/stomatolog.jpg",
    "model": "/models/stomatolog.stl"
  },
  {
    "slug": "stopor",
    "name": "Стопор",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/stopor.jpg",
    "model": "/models/stopor.stl"
  },
  {
    "slug": "stopor-svch-1",
    "name": "Стопор СВЧ 1",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/stopor-svch-1.jpg",
    "model": "/models/stopor-svch-1.stl"
  },
  {
    "slug": "stopor-svch-2",
    "name": "Стопор СВЧ 2",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/stopor-svch-2.jpg",
    "model": "/models/stopor-svch-2.stl"
  },
  {
    "slug": "straykbol",
    "name": "страйкбол",
    "description": "Деталь для хобби/спорта. Изготовлена под конкретную модель или задачу.",
    "price": 500,
    "category": "Хобби",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/straykbol.jpg",
    "model": "/models/straykbol.stl"
  },
  {
    "slug": "struny",
    "name": "Струны",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/struny.jpg",
    "model": "/models/struny.stl"
  },
  {
    "slug": "stupitsa",
    "name": "ступица",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/stupitsa.jpg",
    "model": "/models/stupitsa.stl"
  },
  {
    "slug": "sustav",
    "name": "Сустав",
    "description": "Медицинская / ортопедическая деталь. Изготавливается по заказу.",
    "price": 500,
    "category": "Медицина",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/sustav.jpg",
    "model": "/models/sustav.stl"
  },
  {
    "slug": "tablo",
    "name": "Табло",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/tablo.jpg",
    "model": "/models/tablo.stl"
  },
  {
    "slug": "terka",
    "name": "Терка",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/terka.jpg",
    "model": "/models/terka.stl"
  },
  {
    "slug": "termopot",
    "name": "Термопот",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/termopot.jpg",
    "model": "/models/termopot.stl"
  },
  {
    "slug": "toster",
    "name": "Тостер",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/toster.jpg",
    "model": "/models/toster.stl"
  },
  {
    "slug": "tyaga-pechki",
    "name": "Тяга печки",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/tyaga-pechki.jpg",
    "model": "/models/tyaga-pechki.stl"
  },
  {
    "slug": "unitaz",
    "name": "Унитаз",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/unitaz.jpg",
    "model": "/models/unitaz.stl"
  },
  {
    "slug": "khomut",
    "name": "Хомут",
    "description": "Крепёжная деталь — изготовлена под конкретную задачу. Точные размеры под заказ.",
    "price": 500,
    "category": "Крепёж",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/khomut.jpg",
    "model": "/models/khomut.stl"
  },
  {
    "slug": "shveynaya",
    "name": "швейная",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shveynaya.jpg",
    "model": "/models/shveynaya.stl"
  },
  {
    "slug": "shester",
    "name": "шестер",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shester.jpg",
    "model": "/models/shester.stl"
  },
  {
    "slug": "shesterni",
    "name": "Шестерни",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesterni.jpg",
    "model": "/models/shesterni.stl"
  },
  {
    "slug": "shesterni-kombayn",
    "name": "Шестерни комбайн",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesterni-kombayn.jpg",
    "model": "/models/shesterni-kombayn.stl"
  },
  {
    "slug": "shesternya",
    "name": "шестерня",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya.jpg",
    "model": "/models/shesternya.stl"
  },
  {
    "slug": "17-5",
    "name": "Шестерня 17.5",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/17-5.jpg",
    "model": "/models/17-5.stl"
  },
  {
    "slug": "shesternya-2026",
    "name": "шестерня 2026",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-2026.jpg",
    "model": "/models/shesternya-2026.stl"
  },
  {
    "slug": "shesternya-27-04-26",
    "name": "Шестерня 27.04.26",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-27-04-26.jpg",
    "model": "/models/shesternya-27-04-26.stl"
  },
  {
    "slug": "shesternya-27-10-2025",
    "name": "Шестерня 27.10.2025",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-27-10-2025.jpg",
    "model": "/models/shesternya-27-10-2025.stl"
  },
  {
    "slug": "shesternya-3-v2",
    "name": "Шестерня 3 v2",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-3-v2.jpg",
    "model": "/models/shesternya-3-v2.stl"
  },
  {
    "slug": "shesternya-belaya",
    "name": "шестерня белая",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-belaya.jpg",
    "model": "/models/shesternya-belaya.stl"
  },
  {
    "slug": "shesternya-ivan",
    "name": "Шестерня Иван",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-ivan.jpg",
    "model": "/models/shesternya-ivan.stl"
  },
  {
    "slug": "shesternya-malenkaya",
    "name": "Шестерня маленькая",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-malenkaya.jpg",
    "model": "/models/shesternya-malenkaya.stl"
  },
  {
    "slug": "shesternya-mashinka",
    "name": "Шестерня машинка",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-mashinka.jpg",
    "model": "/models/shesternya-mashinka.stl"
  },
  {
    "slug": "shesternya-mashinka11",
    "name": "Шестерня Машинка11",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-mashinka11.jpg",
    "model": "/models/shesternya-mashinka11.stl"
  },
  {
    "slug": "shesternya-neylon",
    "name": "Шестерня нейлон",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-neylon.jpg",
    "model": "/models/shesternya-neylon.stl"
  },
  {
    "slug": "shesternya-pervaya",
    "name": "Шестерня первая",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-pervaya.jpg",
    "model": "/models/shesternya-pervaya.stl"
  },
  {
    "slug": "shesternya-pylesos",
    "name": "Шестерня пылесос",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-pylesos.jpg",
    "model": "/models/shesternya-pylesos.stl"
  },
  {
    "slug": "shesternya-sborka",
    "name": "Шестерня сборка",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-sborka.jpg",
    "model": "/models/shesternya-sborka.stl"
  },
  {
    "slug": "shesternya-sidushka-kamri",
    "name": "шестерня сидушка камри",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-sidushka-kamri.jpg",
    "model": "/models/shesternya-sidushka-kamri.stl"
  },
  {
    "slug": "shesternya-ugl",
    "name": "шестерня угл",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-ugl.jpg",
    "model": "/models/shesternya-ugl.stl"
  },
  {
    "slug": "shesternya-shtuka",
    "name": "Шестерня штука",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya-shtuka.jpg",
    "model": "/models/shesternya-shtuka.stl"
  },
  {
    "slug": "shesternya11",
    "name": "Шестерня11",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya11.jpg",
    "model": "/models/shesternya11.stl"
  },
  {
    "slug": "shesternya111",
    "name": "Шестерня111",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya111.jpg",
    "model": "/models/shesternya111.stl"
  },
  {
    "slug": "shesternya222",
    "name": "Шестерня222",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya222.jpg",
    "model": "/models/shesternya222.stl"
  },
  {
    "slug": "shesternya333",
    "name": "Шестерня333",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya333.jpg",
    "model": "/models/shesternya333.stl"
  },
  {
    "slug": "shesternya444",
    "name": "Шестерня444",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya444.jpg",
    "model": "/models/shesternya444.stl"
  },
  {
    "slug": "shesternya555",
    "name": "Шестерня555",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shesternya555.jpg",
    "model": "/models/shesternya555.stl"
  },
  {
    "slug": "shkiv",
    "name": "Шкив",
    "description": "Шестерня/шкив — точная деталь, изготовлена под заказ. Материал и параметры уточняются.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shkiv.jpg",
    "model": "/models/shkiv.stl"
  },
  {
    "slug": "shpulka",
    "name": "Шпулька",
    "description": "Запасная деталь для бытовой техники — точная копия оригинала. Изготавливается под заказ.",
    "price": 500,
    "category": "Бытовая техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shpulka.jpg",
    "model": "/models/shpulka.stl"
  },
  {
    "slug": "shrp",
    "name": "ШРП",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shrp.jpg",
    "model": "/models/shrp.stl"
  },
  {
    "slug": "shtutser",
    "name": "Штуцер",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shtutser.jpg",
    "model": "/models/shtutser.stl"
  },
  {
    "slug": "shtuchka",
    "name": "Штучка",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shtuchka.jpg",
    "model": "/models/shtuchka.stl"
  },
  {
    "slug": "shtuchka-rezinovaya",
    "name": "штучка резиновая",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/shtuchka-rezinovaya.jpg",
    "model": "/models/shtuchka-rezinovaya.stl"
  },
  {
    "slug": "ekskavator",
    "name": "Экскаватор",
    "description": "Деталь для техники/оборудования. Изготавливается на замену изношенной или сломанной детали.",
    "price": 500,
    "category": "Техника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/ekskavator.jpg",
    "model": "/models/ekskavator.stl"
  },
  {
    "slug": "emblema",
    "name": "Эмблема",
    "description": "Декоративная деталь, изготовленная по индивидуальному заказу.",
    "price": 500,
    "category": "Декор",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/emblema.jpg",
    "model": "/models/emblema.stl"
  },
  {
    "slug": "yazychok-zamka",
    "name": "язычок замка",
    "description": "Деталь, изготовленная на заказ. Точные размеры и материал уточняются при заказе.",
    "price": 500,
    "category": "Запчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/yazychok-zamka.jpg",
    "model": "/models/yazychok-zamka.stl"
  },
  {
    "slug": "chevrolet",
    "name": "Chevrolet",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/chevrolet.jpg",
    "model": "/models/chevrolet.stl"
  },
  {
    "slug": "grohe-krepezh",
    "name": "Grohe крепеж",
    "description": "Деталь для сантехнического оборудования. Точное соответствие оригинальным размерам.",
    "price": 500,
    "category": "Сантехника",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/grohe-krepezh.jpg",
    "model": "/models/grohe-krepezh.stl"
  },
  {
    "slug": "lada",
    "name": "lada",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/lada.jpg",
    "model": "/models/lada.stl"
  },
  {
    "slug": "nissan-zaglushka",
    "name": "NISSAN Заглушка",
    "description": "Автозапчасть — изготовлена на замену оригинальной детали. Подбор под конкретный автомобиль.",
    "price": 500,
    "category": "Автозапчасти",
    "material": "PLA / PETG / нейлон",
    "image": "/media/models/nissan-zaglushka.jpg",
    "model": "/models/nissan-zaglushka.stl"
  }
];

export const catalogCategories = [...new Set(catalogModels.map((model) => model.category))].sort((a, b) => a.localeCompare(b, "ru"));
