import { LoadingOptions } from "@t/LoadingOptions";
import { isBlank, objectDeepMerge } from "./utils";


const instanceMap: Record<string, Loading> = {};
const centerLoadingIntervalObject: Record<string, number> = {};

let G_LOADING_IDX =0;

let defaultOptions:Required<LoadingOptions> = {
  //  사라지는 시간
  timeout: -1,

  // 시간 표시 여부
  enableTime: false,
  // 표시 내용
  content: "",
  // background color
  bgColor: "#ffffff",
  // z-index
  zIndex: 9999,
  // opacity
  opacity: "0.3",
  // 이미지 경로 및 base64 코드
  loadingImg:
    "data:image/gif;base64,R0lGODlhIAAgALMLADaJuwRsqx57s8bc65rD3FacxoS21bzX6Njo8eTu9bbT5v///wAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QkFBQTEyNEY3MTZBMTFFNTlEMTU4OEI0NTk3MzIxQkYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QkFBQTEyNTA3MTZBMTFFNTlEMTU4OEI0NTk3MzIxQkYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpCQUFBMTI0RDcxNkExMUU1OUQxNTg4QjQ1OTczMjFCRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpCQUFBMTI0RTcxNkExMUU1OUQxNTg4QjQ1OTczMjFCRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2ppaGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEwLy4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAkKAAsALAAAAAAgACAAAATncMlJKQmk6s2nCEKFJJ2mGFWgUoOilFQiCAWlBlPiHjA1Cy/JbXJwIXoTwwwwGS4QOyQFMEMtnC4FSSpR/EhDqGJAEW8XCgAgMylUNbpc0TghqAGF4EDA7rSyZBQFd3hHPVkKB2cUCoN3SGKGHXYAQT2SMAlWXJxciDsJAwQGpKWcnzulqptIqIqiq6ydsx2YMLa1dCWRSHOJi3JZPEh/LoETxYm3lgm+kmK/E1oaYsdPRWc6Cph/R1ldLsA92kHfT1Gcc4bmC+pcYsNoLjnsPXNn9X+eY4zzZeIdEtgqEo/WhmYAN0QAACH5BAkKAAsALAAAAAAgACAAAATqcMlJKRGq6s0nEEBlEJ2mkJSgUkAQlFQCAEW6SoQrwOx8TKqdROAy8CaEWW14M+iOlMIMFVwgXAEUdKGYARKLasEVmiAUCrAEYTD8JlKAsZIbSBIHtAIxObTbfFYAGSUDegp2FAp/I2owhweOFGyMR2d7MH4GiTyBPAmEW6Jbh2iReKWhR6kKB3mpoqmnr4ejtpZbnjCXuhu8R7SRG6imUIZ6nBLHaMm+ocSYa3rCEmkal8kIeY6g0cpofHrVaJJH3YTiVsWir4HpC+2561xoE+dbr47vC8ekiIr1JpUrkaBXnje3OOAZyCECACH5BAkKAAsALAAAAAAgACAAAATucMlJqQKq6s1nAUVlZF2FHBWgUoUglFRijJQKTIp7w9NsIBNb0GXgTQ6+4Gph0BkphBlqIUy4BKRJAobwbYVNQagXCBC0igNwEqVVCIKBBF4OFCUIhf6wXcjkHQMAdQE7EwN6egN9MIRYGwkHiVMwBmV3HXkKazwFnCUJn0+jo4mTCZGmeqSqe5KtrKp8qaqktqOiJbkcmrsUvUavaYwxwpQwiImAh6bLvFm0mxOawzjEeIq/kowJep/JQIkSidc83asL4guax8He4+gLr74b7Djx51k8r4zqEsmlFDjzh6dch1AVJLW7pSGSwQ0RAAAh+QQJCgALACwAAAAAIAAgAAAE53DJSekwo+rNJzFERSidliCVoVIFAJRUoijZpBqT4r5wPie2laQFCPUkiNkhiFsQXIUj5TBDLW6LxI4Ug8l+15UBSjEIBNys4mCVDKoanVV3FjQXSSVQ3d4MCnUCURYzMwN7MIEAaTFUhUcEZ3cceX0lBoglJ1KcnRMBoKECBAmOhYw9oaoBpqedqwGjpacznrZHliW5lHC6vTCmB5kTs0pSb4U1E8iGMEnEpm15a4gKw3jNEwhUiF99yCiPC4XXXuLieUudjnO1Euyc6T5pX6gljtXubvo92RLi2spx2DRlzS1NwqREAAAh+QQJCgALACwAAAAAIAAgAAAE7nDJSSkiqOrNpyJEdWRdlZATGKaGUVKJogyUOiGt+3pykoKT3GF3kw0ltsUhR6QcZCRbIoeS+Eqx3sKmaK2QAIBiEhtRBlDNwHBVFMKAL0KmOFxjVQ3iDS9U0HQDVy9wAAVHJk90RARhXxxzCnkdbEQnTZiZEwKcnXEJinRjmJ2lAqGimaYCYqCiMpqxRAaTkE0GAQE6HZG1Grm5Ao9koYglAwDAAQB/ojQlcykCwLuRdYMKg0UzFLgBowtZVYAZiwt02pbm5pHGRIok5kppTe084FngO4rYsBOAmGQ8kyBPAoJ0WPI8cScrEUIOEQAAIfkECQoACwAsAAAAACAAIAAABPNwyUlpOqnqzedRRzUgnZaQlKKmBFFa6pCuEtIq76xkkor3LVmupgr1aIOWa+hRoXyLhBI14XUSvgw0SfhJDgYDFXugLgZODWJXC4eNi3WRhzWbCG7DcoL2DawleWIbFz5eJQNvL3J2HWw5J0ySkxMAlpcFOx+GhzmXnwCbnJOgAJmFo5SqOQaAJY0cBAICBotpObOzAJ0SqCBDCAW5AgUihkIdBgFCCgC5tURzE48UBQEBABQGzl5YCmZ9JFAJ1wF7TN4/UAvKAQKUm080CwLX0MBF0/MK5ZKbVuskALjmypECZAsCStAjKRKFD3BWEcLAJAIAIfkECQoACwAsAAAAACAAIAAABOtwyUlpOqnqzedRR4VkXZUglaJSw1pOiTpQqgKr4TvV5FJ7KpROgsDtXEXQkPJRCH8xVU8y3UQVmV9yNkn2YgehpOXUxEiXmjgJQpc7CbKsIlcMqpxa29p0vZJiHIBLI0MnS4iJEwaMjQR3fT+IjZQGkZJLlQaPaXo2iqA6BniCSwoAAAR/QUOoqAWfJn05fwWuAAV0elwdBAJcCraoqkQ1GDt4BgICuRMEqLFRgWQoAdYLCcsCsUtXEtYBEsoCAIpNQuATAMsGiEm06RIK2ohNPfESBcukG3MT+OK4vThEQUAAAaFKEAhATEcEACH5BAkKAAsALAAAAAAgACAAAATvcMlJaTqp6s3nUUeFZF2VIJWiUsNaTok6UKoCq+E71eRSeyqUToLA7VxF0JDyUQh/MVVPMt1EFZlfcjZJ9mIHoaTl1MRIl5o4CUKXOwmyrCJXDKqcWtvadL2SYhyASyNDJ0uIiUd6GGl6NoiPOH16iZKNlH6KmyVYhEsDBgY5HYM6oqiBMH2kJQkEqAYEdHpcHQoAQgixpGwYYwEGGgYAAAVMomJRgQABAccC0QsJxQCQiATOARnRAhIExceJAs7CC90TBcWzSwbO3hLoErjFiOQB7OfS6cV4HM4AKMibQOCaDlgVAAgIyOmWgHwvIgAAIfkECQoACwAsAAAAACAAIAAABPBwyUlpOqnqzedRR4VkXZUglaJSw1pOiTpQqgKr4TvV5FJ7KpROgsDtXEXQkPJRCH8xVU8y3UQVmV9yNkn2YgehpOXUxEiXmjgJQpc7CbKsIlcMqpxa29p0vZJiHIBLI0MnS4iJR3oYaXo2iI84fXqJko2UfoqbJYU6CAWEQS8GAQEGQ30YGwoCpqaGdVwTAK8BALMbAwZofWKlpgIERMIaCgYGw10fPQSmqBMFAgKoANYLCcgGgVYp0wIZ1gASB9qKANPQ4hMEyDlDBtPjEutE5kvoApAL9RLtvEumhaJ1jQm3EscqFAAwkFMeAMp0RAAAIfkECQoACwAsAAAAACAAIAAABOtwyUlpOqnqzedRR4VkXZUglaJSw1pOiTpQqgKr4TvV5FJ7KpROgsDtXEXQkPJRCH8xVU8y3UQVmV9yNkn2YgehpOXUxEiXmjgJQpc7CbKsIlcMqpxa29p0vZJiHIBLI0MnS4iJR3oYBAIBkJGJejUHkZcBk5SNj5iKn0OFOgkGhEEvBgICBEN9GBsKAKqqhnVcEwWzAgW3G0VofWKpqgA2CwjFGlsUCB89CqqluAAApQbXC1d4JinUABnX0kk5iAXUrAvhQG9DBNQFE+pUP0vexunYE2TbG+8U8l34wUI3gYABgqA2DDDQq0QEACH5BAkKAAsALAAAAAAgACAAAATocMlJaTqp6s3nUUeFZF2VIJWiUsNaTok6UKoCq+E71eRSeyqUToLA7VxF0JDyUQh/MVVPMt1EFZlfcjZJ9hSBgIEV1MRIl5pwYQgHBASqs5Ro1bgTgDsAwJdqIFUSBAJ7Q0lrHG1iSyOHY0uRkhKAOAmEe2GSlTiZbpuVGJiZk6WHglaQOogvBAAAcTpNgRsHBa+vQ3WAfgu3uAWJGkVos2uurwU2CwkGvQtbFAgfX6+xgwYGNlA8L1UI2QZZSEaS4Tk/Ek3CJQfhR8vM6UPha/MLdqgb2fE+Ll36NhSp8CGHKQ4XAlaIAAAh+QQJCgALACwAAAAAIAAgAAAE8HDJSWk6qerN51FHhWRdRRiVolLDWk5JEACUqsBq+E5ycEs2jwqxmxhkgklwgcgVKQIZahFM2EiwF6FHDDYVA8oXqxAAphKArKCxki42osQgqAN+gwB6k2jZwhQFdXUFci82IFg1AINJO1+GHHQCBE8jRQl7T5ubiDlWBQCio5yeOaOoNJ2eGAqhqZyxm5c7VpZDLwcGBoC5NhgbCLvDmH4qvRInwwSKGk1vH7gSursEgG7Ox2IfWMIGOhJ+XStWKs1tFeUKGUtf4E/RcksL8bNOQC4L6pvRZPkLfs5x0KbkHxOBHBJEogdC1osLCDVEAAA7",
  // css cursor
  cursor: "wait",

  // 취소 버튼 활성화 여부
  enableCancelButton: false,
  // 취소 벼튼 활성화시  callback 메소드
  callback: (param) => {
    return true;
  },
};

/**
 * Loading 모듈
 */

export class Loading {

  private selector: string;
  private containerNode: HTMLElement | null;
  private loadingElement: HTMLElement | null;
  private options: Required<LoadingOptions>;
  private orginStylePosition = "";

  constructor(selector: string | HTMLElement | null | undefined, options : LoadingOptions = {}) {

    if(isBlank(selector)){
      selector = "body";
    }

    if (selector instanceof HTMLElement) {
      this.containerNode = selector;
      this.selector = "";
    } else {
      selector = selector || "body";
      this.containerNode = document.querySelector(selector);
      this.selector = selector;
    }

    if (!this.containerNode) return;

    this.options = objectDeepMerge(defaultOptions, options);
    instanceMap[this.selector] = this;

    this.show();
  }

  public static create(selector: string | HTMLElement | null | undefined, options?: LoadingOptions) {
    return new Loading(selector, options);
  }

  public static instance(selector: string) {
    return instanceMap[selector];
  }

  public static setOptions(options: LoadingOptions) {
    defaultOptions = Object.assign({}, defaultOptions, options);
  }

  private cancelHandler() {
    const callback = this.options.callback;
    if (callback) {
      if (callback(this.options) !== false) {
        this.hide();
      }
    } else {
      this.hide();
    }
  }

  
  /**
   * show loading module
   * @public
   */ 
  public show (){
    const containerNode = this.containerNode;
    if (!containerNode) return;

    if (containerNode.querySelector(":scope >.daracl-cl")) return;

    this.orginStylePosition = containerNode.style.position;
    const computedStyle = getComputedStyle(containerNode);

    if (!["absolute", "relative", "fixed", "sticky"].includes(computedStyle.position)) {
      containerNode.style.position = "relative";
    }

    const opts = this.options;

    let zIndex = opts.zIndex;
    if(defaultOptions.zIndex == opts.zIndex){
      zIndex += ++G_LOADING_IDX;
    }

    let template = `
      <div class="daracl-cl" style="cursor: ${opts.cursor}; top: 0px; left: 0px; z-index: ${zIndex}; position: absolute; width: 100%; height: 100%;">
        <div style="position: absolute; background: ${opts.bgColor}; opacity: ${opts.opacity}; width: 100%; height: 100%; z-index: 1"></div>
        <div style="z-index: 10; text-align: center; margin: 0; position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%)">
          ${
            opts.enableTime
              ? `<div class="daracl-cl-time" style="position: absolute; z-index: ${opts.zIndex + 1}; width: 100%; margin-top: 8px;">0</div>`
              : ""
          }
          <img class="daracl-cl-image" src="${opts.loadingImg}" />
    `;

    if (opts.content) {
      template += `<div class="daracl-cl-content">${opts.content}</div>`;
    }

    if (opts.enableCancelButton) {
      template += `<div style="height: 35px; line-height: 35px;"><button type="button" class="daracl-cl-btn">Cancel</button></div>`;
    }

    template += `</div></div>`;

    containerNode.insertAdjacentHTML("afterbegin", template);

    this.loadingElement = containerNode.querySelector(":scope >.daracl-cl");

    if (opts.enableCancelButton) {
      this.loadingElement?.querySelector(".daracl-cl-btn")
        ?.addEventListener("click", () => this.cancelHandler());
    }

    if (opts.enableTime) {
      const loadingTimeElement = this.loadingElement?.querySelector(".daracl-cl-time") as HTMLElement;
      let sec = 0;
      centerLoadingIntervalObject[this.selector] = window.setInterval(() => {
        loadingTimeElement.innerText = `${++sec}`;
      }, 1000);
    }

    if (opts.timeout > 0) {
      setTimeout(() => this.hide(), opts.timeout);
    }
  };

  
  /**
   * set display content
   *
   * @public
   * @param {string} content 
   */
  public setContent (content: string){
    if (!this.containerNode) return;

    const existing = this.loadingElement?.querySelector(".daracl-cl-content");
    if (!existing) {
      this.loadingElement?.querySelector(".daracl-cl-image")
        ?.insertAdjacentHTML("afterend", `<div class="daracl-cl-content">${content}</div>`);
    } else {
      existing.innerHTML = content;
    }
  };

  
  /**
   * hide loading module
   *
   * @public
   * @param {?boolean} [flag] 
   */
  public hide (flag?: boolean){
    if (this.containerNode) {
      this.containerNode.style.position = this.orginStylePosition || "";

      const loadingEle = this.containerNode.querySelector(":scope >.daracl-cl");

      if (loadingEle) {
        this.containerNode.removeChild(loadingEle);
      }

      if (this.options.enableTime) {
        clearInterval(centerLoadingIntervalObject[this.selector]);
        delete centerLoadingIntervalObject[this.selector];
      }
    }

    if (flag !== false) {
      delete instanceMap[this.selector];
    }
  };

  
  /**
   * destroy loading instance
   *
   * @public
   * @static
   * @param {string} selector 
   */
  public static destroy(selector: string) {
    if (instanceMap[selector]) {
      instanceMap[selector].hide(false);
      delete instanceMap[selector];
    }
  }
}