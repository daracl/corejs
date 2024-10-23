/**
 *  app web 기본 셋팅
 */
(function () {
  "use strict";
  window.AppWeb = DaraWeb.create({
    contextPath: "/test11",
    uriPrefix: { admin: "/admin" },
    csrf: { token: "token", parameter: "dara-param" },
    staticResource: {
      fileupload: {
        js: ["https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone-min.js"],
        css: ["https://unpkg.com/dropzone@6.0.0-beta.2/dist/dropzone.css"],
      },
    },
    message: {
      "save.confirm": "{name} 저장하시겠습니까?",
    },
    fileUpload: {
      maxUploadSize: 123123,
      maxUploadSizePerFile: 123,
    },

    date: {
      format: {
        yyyy: "YYYY",
        yyyy_mm: "YYYY-MM",
        yyyy_mm_dd: "YYYY-MM-DD",
        hh_mm: "HH:mm",
        hh_mm_ss: "HH:mm:ss",
        timestamp: "YYYY-MM-DD HH:mm:ss",
      },
    },
  });
})();
