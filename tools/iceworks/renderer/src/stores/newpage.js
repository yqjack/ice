import { observable, action, computed } from 'mobx';
import path from 'path';

import { scanPages } from '../lib/project-utils';
import projects from './projects';
import projectScripts from '../lib/project-scripts';
import scanLayout from '../datacenter/scanLayout';

// useStrict(true); // 严格模式，只能内部修改值

// tog 下面这个配置应该移动出来单独存放
// 由于快速修复线上 bug 等正式版将其移走
// XXX 不在白名单里的 Layout 直接返回

/**
 * 新建页面
 */

class NewPage {
  @observable
  targetPath = ''; // 生成的目标路径
  @observable
  layouts = []; // 所有 layouts
  @observable
  loading = true;
  @observable
  currentLayout = []; // 当前选中的 layout
  @observable
  visible = false; // 控制弹窗展示
  @observable
  savePageVisible = false; // 控制 page 保存 dialog 的显示
  @observable
  isCreatingValue = false; // 用于控制 pageConfig 确定按钮 loading 状态

  @computed
  get isCreating() {
    return this.isCreatingValue;
  }

  set isCreating(value) {
    this.isCreatingValue = value;
  }

  @action
  openSave() {
    this.savePageVisible = true;
  }

  @action
  closeSave() {
    this.savePageVisible = false;
  }

  @action
  toggle() {
    if (!this.targetPath) {
      console.error('新建页面未设置 targetPath');
    } else {
      this.visible = !this.visible;
      // 每次展开更新数据
      if (this.visible) {
        this.reset();
        this.fetch();

        const p = projects.getProject(this.targetPath);
        const applicationType = p.getApplicationType();
        const libraryTYpe = p.getLibraryType();
        // react 项目不启动服务
        if (!(libraryTYpe == 'react' && applicationType == 'react')) {
          projectScripts.start(p);
        }
      }
    }
  }

  @action
  setTargetPath(targetPath) {
    this.targetPath = targetPath;
  }

  @action
  fetch() {
    const destDir = this.targetPath;
    const type = projects.currentProject.getLibraryType(); // 当前项目框架库类型
    this.loading = true;
    const scanPath = projects.currentProject.isNodeProject
      ? path.join(destDir, 'client')
      : path.join(destDir, 'src');
    Promise.all([
      scanLayout({ targetPath: scanPath, type }),
      scanPages(scanPath),
    ])
      .then(this.fetchSuccess)
      .catch(this.fetchFailed);
  }

  // fetch success 回调
  @action.bound
  fetchSuccess([layouts, pages]) {
    const projectPkgData = projects.currentProject.getPkgData();
    console.log('scaned layouts', layouts);

    const scaffoldConfig =
      (projectPkgData && projectPkgData.scaffoldConfig) || {};

    console.log('scaffoldConfig data', scaffoldConfig);

    const defaultLayout = scaffoldConfig.defaultLayout;

    const localLayouts = layouts.filter((n) => n.localization);

    console.log('localLayouts', localLayouts, defaultLayout);

    let currentLayout = layouts[0];
    if (Array.isArray(localLayouts) && localLayouts.length) {
      if (defaultLayout) {
        currentLayout =
          localLayouts.find((l) => l.folderName == defaultLayout) ||
          localLayouts[0];
      } else {
        currentLayout = localLayouts[0];
      }
    }

    this.layouts = layouts;
    this.currentLayout = currentLayout;
    this.pages = pages; // 获取页面数，用于生产页面时，默认的页面名
    this.loading = false;
  }
  // fetch failed 回调
  @action.bound
  fetchFailed(...args) {
    this.loading = false;
    console.log(args);
  }

  @action
  reset() {
    this.pages = []; // 当前项目所有 page
    this.layouts = []; // 所有 layout 列表
  }

  @action
  setCurrentLayout(layout) {
    this.currentLayout = layout;
  }


}

export default new NewPage();
