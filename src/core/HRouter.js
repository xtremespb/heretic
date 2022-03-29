module.exports = class {
    constructor(routes, languages, home) {
        this.states = [];
        this.stateIndex = null;
        this.actions = [];
        this.home = home;
        this.route = {
            id: null,
            language: null,
        };
        this.routes = routes;
        this.languages = languages;
        this.init();
    }

    getLocationData() {
        const {
            pathname
        } = new URL(window.location);
        const data = {
            language: this.languages[0],
            id: null,
        };
        const parts = pathname.split(/\//).filter(i => i);
        for (const language of this.languages) {
            if (parts[0] === language) {
                parts.splice(0, 1);
                data.language = language;
                break;
            }
        }
        let path = parts.join("/") || "";
        path = path.charAt(0) === "/" ? path : `/${path}`;
        path = path === "/" ? "" : path;
        const route = this.routes.find(r => r.path === path);
        if (route) {
            data.id = route.id;
        }
        return data;
    }

    init() {
        if (window.location.href === "about:srcdoc") {
            return;
        }
        this.route = this.getLocationData();
        let historyState = window.history.state;
        if (historyState && historyState.hRouter) {
            historyState = historyState.state;
        }
        const ghostState = this.buildState(historyState, 0);
        window.history.replaceState(ghostState, null, null);
        this.states.push(ghostState);
        const firstState = this.buildState(historyState, 1);
        window.history.pushState(firstState, null, null);
        this.states.push(firstState);
        this.stateIndex = 1;
        window.addEventListener("popstate", this.handlePopState.bind(this));
    }

    buildState(historyState, index) {
        return {
            state: historyState,
            index,
            hRouter: true,
        };
    }

    setOnRouteChangeHandler(handler) {
        this.routeChangeHandler = handler;
    }

    handlePopState(e) {
        const newState = e.state;
        if (newState === null || !newState.hRouter) {
            return;
        }
        const action = this.actions.length === 0 ? null : this.actions.splice(0, 1)[0];
        this.stateIndex = newState.index;
        if (action && action.type === "CLEAN_FORWARD_HISTORY") {
            this.stateIndex += 1;
            this.states.splice(this.stateIndex + 1, this.states.length - (this.stateIndex + 1));
            window.history.pushState(action.payload, null, null);
            return;
        }
        if (this.stateIndex <= 0) {
            window.history.go(-1);
        }
        this.route = this.getLocationData();
        if (this.routeChangeHandler) {
            this.routeChangeHandler(this);
        }
    }

    replaceState(state, title, url) {
        const currentState = this.states[this.stateIndex];
        currentState.state = state;
        window.history.replaceState(currentState, title, url);
    }

    pushState(state, title, url) {
        this.stateIndex += 1;
        const newState = this.buildState(state, this.stateIndex);
        this.states.splice(this.stateIndex, this.states.length - this.stateIndex, newState);
        window.history.pushState(newState, title, url);
    }

    go(delta) {
        if (delta === 0) {
            return;
        }
        if (this.stateIndex + delta <= 0) {
            // skipping ghost state
            delta -= 1;
        }
        this.stateIndex += delta;
        this.actions.push({
            type: "GO",
            payload: null
        });
        window.history.go(delta);
    }

    forward(...params) {
        const distance = params.length > 0 && params[0] !== undefined ? params[0] : 1;
        return this.go(distance);
    }

    back(...params) {
        const distance = params.length > 0 && params[0] !== undefined ? params[0] : 1;
        return this.go(-distance);
    }

    cleanForwardHistory(...params) {
        const delta = params.length > 0 && params[0] !== undefined ? params[0] : 0;
        // HACK because successive calls may overlap
        this.actions.push({
            type: "CLEAN_FORWARD_HISTORY",
            payload: this.states[this.stateIndex + delta]
        });
        window.history.go(-1 + delta);
    }

    getStateIndex() {
        return this.stateIndex - 1;
    }

    getRoute() {
        return this.route;
    }

    navigate(routeId, language = this.languages[0]) {
        const routeItem = this.routes.find(r => r.id === routeId);
        if (!routeItem) {
            return;
        }
        const lang = language === this.languages[0] ? "" : language;
        if (routeItem.id === this.home) {
            routeItem.path = "";
        }
        const url = `/${[lang, ...routeItem.path.split(/\//)].filter(i => i).join("/")}`;
        this.pushState({}, window.title, url);
        this.route = this.getLocationData();
        if (this.routeChangeHandler) {
            this.routeChangeHandler(this);
        }
    }
};
