const Router = require("../../lib/router");
const languages = require("../../../config/languages.json");
const navigation = require("../../../config/navigation.json");
const routes = require("../../../build/routes.json");

module.exports = class {
    onCreate() {
        const state = {
            route: null,
            language: Object.keys(languages)[0],
        };
        this.state = state;
    }

    onMount() {
        const router = new Router(routes, Object.keys(languages), navigation.home);
        router.setOnRouteChangeHandler(this.onRouteChangeHandler.bind(this));
        this.emit("route-change", router);
        window.__heretic = window.__heretic || {};
        window.__heretic.router = router;
    }

    onRouteChangeHandler(router) {
        this.emit("route-change", router);
    }
};
