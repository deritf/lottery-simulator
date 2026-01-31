// assets/js/shared/ui/draw-debug-categories.js

/**
 * Definiciones de categorías de premios para cada juego
 *
 * Cambio: ahora acepta ctx (por ejemplo { drawType }) para que
 * Lotería Nacional pueda mostrar categorías distintas según sorteo.
 */

export function getCategoryRows(gameId, t, lang, ctx = {}) {
  const isEuro = gameId === "euromillones";
  const isEurodreams = gameId === "eurodreams";
  const isBonoloto = gameId === "bonoloto";
  const isGordo = gameId === "gordo";
  const isLN = gameId === "loteria-nacional";
  const isQuiniela = gameId === "quiniela";
  const isLototurf = gameId === "lototurf";

  if (isLN) return loteriaNacionalRows(t, lang, ctx);
  if (isGordo) return gordoRows(t, lang);
  if (isBonoloto) return bonolotoRows(t, lang);
  if (isEuro) return euroRows(t, lang);
  if (isEurodreams) return eurodreamsRows(t, lang);
  if (isQuiniela) return quinielaRows(t, lang);
  if (isLototurf) return lototurfRows(t, lang);

  return primitivaRows(t, lang);
}

function primitivaRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categories.${k}`, fb);

  return [
    {
      key: "6R",
      label: cat("6R", lang === "en" ? "Jackpot (6+R)" : "Bote (6+R)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "6",
      label: cat("6", lang === "en" ? "1st (6)" : "1ª (6)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "5C",
      label: cat("5C", lang === "en" ? "2nd (5+C)" : "2ª (5+C)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "5",
      label: cat("5", lang === "en" ? "3rd (5)" : "3ª (5)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "4",
      label: cat("4", lang === "en" ? "4th (4)" : "4ª (4)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "3",
      label: cat("3", lang === "en" ? "5th (3)" : "5ª (3)"),
      icon: "medal",
      tone: "ddm__catGray",
    },
    {
      key: "R",
      label: cat("R", lang === "en" ? "Refund (R)" : "Reintegro (R)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function bonolotoRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesBonoloto.${k}`, fb);

  return [
    {
      key: "6",
      label: cat("6", lang === "en" ? "1st (6)" : "1ª (6)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "5C",
      label: cat("5C", lang === "en" ? "2nd (5+C)" : "2ª (5+C)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "5",
      label: cat("5", lang === "en" ? "3rd (5)" : "3ª (5)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "4",
      label: cat("4", lang === "en" ? "4th (4)" : "4ª (4)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "3",
      label: cat("3", lang === "en" ? "5th (3)" : "5ª (3)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "R",
      label: cat("R", lang === "en" ? "Refund (R)" : "Reintegro (R)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function euroRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesEuro.${k}`, fb);

  return [
    {
      key: "5+2",
      label: cat("5+2", lang === "en" ? "Jackpot (5+2★)" : "Bote (5+2★)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "5+1",
      label: cat("5+1", lang === "en" ? "2nd (5+1★)" : "2ª (5+1★)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "5+0",
      label: cat("5+0", lang === "en" ? "3rd (5+0★)" : "3ª (5+0★)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "4+2",
      label: cat("4+2", lang === "en" ? "4th (4+2★)" : "4ª (4+2★)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "4+1",
      label: cat("4+1", lang === "en" ? "5th (4+1★)" : "5ª (4+1★)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "3+2",
      label: cat("3+2", lang === "en" ? "6th (3+2★)" : "6ª (3+2★)"),
      icon: "medal",
      tone: "ddm__catGray",
    },
    {
      key: "4+0",
      label: cat("4+0", lang === "en" ? "7th (4+0★)" : "7ª (4+0★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "2+2",
      label: cat("2+2", lang === "en" ? "8th (2+2★)" : "8ª (2+2★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "3+1",
      label: cat("3+1", lang === "en" ? "9th (3+1★)" : "9ª (3+1★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "3+0",
      label: cat("3+0", lang === "en" ? "10th (3+0★)" : "10ª (3+0★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "1+2",
      label: cat("1+2", lang === "en" ? "11th (1+2★)" : "11ª (1+2★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "2+1",
      label: cat("2+1", lang === "en" ? "12th (2+1★)" : "12ª (2+1★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "2+0",
      label: cat("2+0", lang === "en" ? "13th (2+0★)" : "13ª (2+0★)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function eurodreamsRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesEurodreams.${k}`, fb);

  return [
    {
      key: "6+1",
      label: cat("6+1", lang === "en" ? "Top (6+Dream)" : "Top (6+Sueño)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "6+0",
      label: cat("6+0", lang === "en" ? "2nd (6)" : "2ª (6)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },

    {
      key: "3",
      label: cat("3", lang === "en" ? "3rd (5)" : "3ª (5)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },

    {
      key: "4",
      label: cat("4", lang === "en" ? "4th (4)" : "4ª (4)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },

    {
      key: "5",
      label: cat("5", lang === "en" ? "5th (3)" : "5ª (3)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },

    {
      key: "6",
      label: cat("6", lang === "en" ? "6th (2)" : "6ª (2)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function gordoRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesGordo.${k}`, fb);

  return [
    {
      key: "5+1",
      label: cat("5+1", lang === "en" ? "Jackpot (5+Key)" : "Bote (5+Clave)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },

    {
      key: "5+0",
      dataKey: "5",
      label: cat("5+0", lang === "en" ? "2nd (5)" : "2ª (5)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },

    {
      key: "4+1",
      label: cat("4+1", lang === "en" ? "3rd (4+Key)" : "3ª (4+Clave)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },

    {
      key: "4+0",
      dataKey: "4",
      label: cat("4+0", lang === "en" ? "4th (4)" : "4ª (4)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },

    {
      key: "3+1",
      label: cat("3+1", lang === "en" ? "5th (3+Key)" : "5ª (3+Clave)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },

    {
      key: "3+0",
      dataKey: "3",
      label: cat("3+0", lang === "en" ? "6th (3)" : "6ª (3)"),
      icon: "medal",
      tone: "ddm__catGray",
    },

    {
      key: "2+1",
      label: cat("2+1", lang === "en" ? "7th (2+Key)" : "7ª (2+Clave)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },

    {
      key: "2+0",
      dataKey: "2",
      label: cat("2+0", lang === "en" ? "8th (2)" : "8ª (2)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },

    {
      key: "R",
      label: cat("R", lang === "en" ? "Refund (Key)" : "Reintegro (Clave)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function quinielaRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesQuiniela.${k}`, fb);

  return [
    // Pleno al 15 arriba del todo (mayor premio)
    {
      key: "pleno15", // clave “lógica” (coherente)
      label: cat("P15", lang === "en" ? "Pleno al 15" : "Pleno al 15"),
      icon: "trophy",
      tone: "ddm__catGold",
    },

    {
      key: "14",
      label: cat("14", lang === "en" ? "14 hits" : "14 aciertos"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "13",
      label: cat("13", lang === "en" ? "13 hits" : "13 aciertos"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "12",
      label: cat("12", lang === "en" ? "12 hits" : "12 aciertos"),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "11",
      label: cat("11", lang === "en" ? "11 hits" : "11 aciertos"),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "10",
      label: cat("10", lang === "en" ? "10 hits" : "10 aciertos"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function loteriaNacionalRows(t, lang, ctx = {}) {
  const cat = (k, fb) =>
    t(`results.drawDetail.categoriesLoteriaNacional.${k}`, fb);

  const dt = String(ctx?.drawType || "navidad");

  // Ordinarios: jueves/sábado
  if (dt === "jueves" || dt === "sabado") {
    return [
      {
        key: "gordo",
        label: cat("gordo", lang === "en" ? "1st prize" : "Primer premio"),
        icon: "trophy",
        tone: "ddm__catGold",
      },
      {
        key: "segundo",
        label: cat("segundo", lang === "en" ? "2nd prize" : "Segundo premio"),
        icon: "medal",
        tone: "ddm__catSilver",
      },
      {
        key: "ln_last_4",
        label: cat(
          "ln_last_4",
          lang === "en" ? "Last 4 digits" : "Últimas 4 cifras",
        ),
        icon: "medal",
        tone: "ddm__catBronze",
      },
      {
        key: "ln_last_3",
        label: cat(
          "ln_last_3",
          lang === "en" ? "Last 3 digits" : "Últimas 3 cifras",
        ),
        icon: "medal",
        tone: "ddm__catBlue",
      },
      {
        key: "ln_last_2",
        label: cat(
          "ln_last_2",
          lang === "en" ? "Last 2 digits" : "Últimas 2 cifras",
        ),
        icon: "medal",
        tone: "ddm__catGreen",
      },
      {
        key: "last_1",
        label: cat("last_1", lang === "en" ? "Refund" : "Reintegro"),
        icon: "medal",
        tone: "ddm__catNeutral",
      },
    ];
  }

  // El Niño
  if (dt === "nino") {
    return [
      {
        key: "gordo",
        label: cat("gordo", lang === "en" ? "1st prize" : "Primer premio"),
        icon: "trophy",
        tone: "ddm__catGold",
      },
      {
        key: "segundo",
        label: cat("segundo", lang === "en" ? "2nd prize" : "Segundo premio"),
        icon: "medal",
        tone: "ddm__catSilver",
      },
      {
        key: "tercero",
        label: cat("tercero", lang === "en" ? "3rd prize" : "Tercer premio"),
        icon: "medal",
        tone: "ddm__catBronze",
      },
      {
        key: "approx_gordo_nino",
        label: cat(
          "approx_gordo_nino",
          lang === "en" ? "Approx. 1st (±1)" : "Aprox. 1º (±1)",
        ),
        icon: "medal",
        tone: "ddm__catNeutral",
      },
      {
        key: "approx_2",
        label: cat(
          "approx_2",
          lang === "en" ? "Approx. 2nd (±1)" : "Aprox. 2º (±1)",
        ),
        icon: "medal",
        tone: "ddm__catNeutral",
      },
      {
        key: "centenas",
        label: cat(
          "centenas",
          lang === "en" ? "Same hundreds" : "Mismas centenas",
        ),
        icon: "medal",
        tone: "ddm__catNeutral",
      },
      {
        key: "ln_extract_4",
        label: cat(
          "ln_extract_4",
          lang === "en" ? "4-digit extraction" : "Extracción 4 cifras",
        ),
        icon: "medal",
        tone: "ddm__catBlue",
      },
      {
        key: "ln_extract_3",
        label: cat(
          "ln_extract_3",
          lang === "en" ? "3-digit extraction" : "Extracción 3 cifras",
        ),
        icon: "medal",
        tone: "ddm__catGreen",
      },
      {
        key: "ln_extract_2",
        label: cat(
          "ln_extract_2",
          lang === "en" ? "2-digit extraction" : "Extracción 2 cifras",
        ),
        icon: "medal",
        tone: "ddm__catGray",
      },
      {
        key: "last_1",
        label: cat("last_1", lang === "en" ? "Refund" : "Reintegro"),
        icon: "medal",
        tone: "ddm__catNeutral",
      },
    ];
  }

  // Navidad
  return [
    {
      key: "gordo",
      label: cat("gordo", lang === "en" ? "El Gordo" : "El Gordo"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "segundo",
      label: cat("segundo", lang === "en" ? "2nd Prize" : "Segundo Premio"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "tercero",
      label: cat("tercero", lang === "en" ? "3rd Prize" : "Tercer Premio"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "cuartos",
      label: cat(
        "cuartos",
        lang === "en" ? "4th Prizes (×2)" : "Cuartos Premios (×2)",
      ),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "quintos",
      label: cat(
        "quintos",
        lang === "en" ? "5th Prizes (×8)" : "Quintos Premios (×8)",
      ),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "pedreas",
      label: cat("pedreas", lang === "en" ? "Pedrea" : "Pedrea"),
      icon: "medal",
      tone: "ddm__catGray",
    },
    {
      key: "approx_gordo",
      label: cat(
        "approx_gordo",
        lang === "en" ? "Approx. Gordo (±1)" : "Aprox. Gordo (±1)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "approx_2",
      label: cat(
        "approx_2",
        lang === "en" ? "Approx. 2nd (±1)" : "Aprox. 2º (±1)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "approx_3",
      label: cat(
        "approx_3",
        lang === "en" ? "Approx. 3rd (±1)" : "Aprox. 3º (±1)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "centenas",
      label: cat(
        "centenas",
        lang === "en" ? "Same hundreds" : "Mismas centenas",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "last_2",
      label: cat(
        "last_2_1st",
        lang === "en" ? "Last 2 digits (1st)" : "2 últimas cifras (1º)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "last_2_segundo",
      label: cat(
        "last_2_segundo",
        lang === "en" ? "Last 2 digits (2nd)" : "2 últimas cifras (2º)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "last_2_tercero",
      label: cat(
        "last_2_tercero",
        lang === "en" ? "Last 2 digits (3rd)" : "2 últimas cifras (3º)",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "last_1",
      label: cat("last_1", lang === "en" ? "Refund" : "Reintegro"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}

function lototurfRows(t, lang) {
  const cat = (k, fb) => t(`results.drawDetail.categoriesLototurf.${k}`, fb);

  return [
    {
      key: "6+horse",
      label: cat("6+horse", lang === "en" ? "1st (6+Horse)" : "1ª (6+Caballo)"),
      icon: "trophy",
      tone: "ddm__catGold",
    },
    {
      key: "6",
      label: cat("6", lang === "en" ? "2nd (6)" : "2ª (6)"),
      icon: "medal",
      tone: "ddm__catSilver",
    },
    {
      key: "5+horse",
      label: cat("5+horse", lang === "en" ? "3rd (5+Horse)" : "3ª (5+Caballo)"),
      icon: "medal",
      tone: "ddm__catBronze",
    },
    {
      key: "5",
      label: cat("5", lang === "en" ? "4th (5)" : "4ª (5)"),
      icon: "medal",
      tone: "ddm__catBlue",
    },
    {
      key: "4+horse",
      label: cat("4+horse", lang === "en" ? "5th (4+Horse)" : "5ª (4+Caballo)"),
      icon: "medal",
      tone: "ddm__catGreen",
    },
    {
      key: "4",
      label: cat("4", lang === "en" ? "6th (4)" : "6ª (4)"),
      icon: "medal",
      tone: "ddm__catGray",
    },
    {
      key: "3+horse",
      label: cat("3+horse", lang === "en" ? "7th (3+Horse)" : "7ª (3+Caballo)"),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
    {
      key: "reintegro",
      label: cat(
        "reintegro",
        lang === "en" ? "Refund (Reintegro)" : "Reintegro",
      ),
      icon: "medal",
      tone: "ddm__catNeutral",
    },
  ];
}
