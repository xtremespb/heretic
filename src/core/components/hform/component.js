const cloneDeep = require("lodash.clonedeep");
const serializableTypes = require("./serializableTypes.json");
const FormValidator = require("../../lib/formValidatorBrowser").default;
const formValidatorUtils = require("../../lib/formValidatorUtils");

module.exports = class {
    onCreate(input) {
        this.state = {
            loading: false,
            progress: false,
            tabs: input.tabsStart ? input.tabsStart : input.tabs ? input.tabs.map(t => t.id) : ["_default"],
            activeTab: input.tabs ? input.tabs[0].id : "_default",
            addTabDropdownActive: false,
            data: {},
            errors: {},
            errorMessage: null,
        };
        this.fieldIds = [];
        this.sharedFieldIds = [];
        this.fieldsFlat = {};
        // Collect field IDs
        for (const area of input.data.form) {
            for (const item of area.fields) {
                if (Array.isArray(item)) {
                    for (const subItem of item) {
                        this.fieldIds.push(subItem.id);
                        if (subItem.shared) {
                            this.sharedFieldIds.push(subItem.id);
                        }
                        this.fieldsFlat[subItem.id] = subItem;
                    }
                } else {
                    this.fieldIds.push(item.id);
                    this.fieldsFlat[item.id] = item;
                    if (item.shared) {
                        this.sharedFieldIds.push(item.id);
                    }
                }
            }
        }
        if (input.validationSchema) {
            this.formValidator = new FormValidator(input.validationSchema, this.fieldsFlat);
        }
    }

    onErrorMessageClose() {
        this.setState("errorMessage", null);
    }

    setDefaultValues() {
        for (const id of this.fieldIds) {
            if (this.fieldsFlat[id].defaultValue) {
                this.setValue(id, this.fieldsFlat[id].defaultValue);
            } else if (this.fieldsFlat[id].type === "select") {
                this.setValue(id, this.fieldsFlat[id].options[0].value);
            }
        }
    }

    clearValues() {
        for (const id of this.fieldIds) {
            this.setValue(id, null);
        }
    }

    focus() {
        for (const area of this.input.data.form) {
            for (const field of area.fields) {
                if (field.autoFocus) {
                    const component = this.getComponent(`hr_hf_f_${field.id}`);
                    if (component && component.focus) {
                        component.focus();
                    }
                }
            }
        }
    }

    onMount() {
        this.focus();
        this.setDefaultValues();
        window.addEventListener("click", e => {
            const dbAddTabElement = document.getElementById(`${this.input.id}_dm_addTab`);
            if (dbAddTabElement && !dbAddTabElement.contains(e.target)) {
                this.setState("addTabDropdownActive", false);
            }
        });
    }

    serializeView() {
        const data = {};
        // Get data for each field
        for (const id of this.fieldIds) {
            if (serializableTypes.indexOf(this.fieldsFlat[id].type) > -1) {
                const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
                if (fieldComponent) {
                    data[id] = fieldComponent.getValue();
                }
            }
        }
        return data;
    }

    deserializeView(serialized) {
        const data = {};
        for (const id of this.fieldIds) {
            if (serializableTypes.indexOf(this.fieldsFlat[id].type) > -1) {
                const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
                if (fieldComponent) {
                    fieldComponent.setValue(serialized[id]);
                }
            }
        }
        return data;
    }

    validate(data) {
        for (const tab of this.state.tabs) {
            if (this.formValidator) {
                const result = this.formValidator.validate(data[tab], tab);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    getErrorData(validationResult) {
        if (!validationResult || !(Symbol.iterator in Object(validationResult))) {
            return {};
        }
        return formValidatorUtils.getErrorData(validationResult, window.__heretic.t);
    }

    setValue(id, value) {
        const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
        if (fieldComponent) {
            fieldComponent.setValue(value);
        }
    }

    getValue(id) {
        const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
        if (fieldComponent) {
            return fieldComponent.getValue();
        }
        return null;
    }

    setErrors(errorData) {
        this.clearErrors();
        if (!errorData || !(Symbol.iterator in Object(errorData))) {
            return;
        }
        let focused = false;
        let tab = null;
        for (const item of errorData) {
            if (!tab) {
                this.setTab(item.tab);
                tab = item.tab;
            }
            const fieldComponent = this.getComponent(`hr_hf_f_${item.id}`);
            if (fieldComponent) {
                fieldComponent.setError(item.errorMessage);
                if (!focused) {
                    fieldComponent.focus();
                    focused = true;
                }
            }
        }
    }

    clearErrors() {
        for (const id of this.fieldIds) {
            const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
            if (fieldComponent) {
                fieldComponent.clearError();
            }
        }
    }

    setComponentsState(flag) {
        for (const id of this.fieldIds) {
            const fieldComponent = this.getComponent(`hr_hf_f_${id}`);
            if (fieldComponent) {
                fieldComponent.setLoading(flag);
            }
        }
    }

    setLoading(flag) {
        this.setState("loading", flag);
        this.setComponentsState(flag);
    }

    setProgress(flag) {
        this.setState("progress", flag);
        this.setComponentsState(flag);
    }

    onFormSubmit(e) {
        e.preventDefault();
        this.emit("form-submit", {});
    }

    onButtonClick(payload) {
        this.emit("button-click", payload);
    }

    onAddTabDropdownTriggerClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState("addTabDropdownActive", true);
    }

    onAddTabDropdownItemClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const {
            id
        } = e.target.closest("[data-id]").dataset;
        this.setState("addTabDropdownActive", false);
        this.setState("tabs", [...this.state.tabs, id]);
    }

    copySharedFields(data, prevTab) {
        for (const tab of this.state.tabs) {
            if (!data[tab]) {
                data[tab] = {};
                for (const fieldId of this.fieldIds) {
                    if (this.fieldsFlat[fieldId].defaultValue) {
                        data[tab][fieldId] = this.fieldsFlat[fieldId].defaultValue;
                    } else {
                        data[tab][fieldId] = null;
                    }
                }
            }
            for (const sharedId of this.sharedFieldIds) {
                data[tab][sharedId] = data[prevTab][sharedId];
            }
        }
    }

    saveView() {
        const data = cloneDeep(this.state.data);
        data[this.state.activeTab] = this.serializeView();
        this.copySharedFields(data, this.state.activeTab);
        this.setState("data", data);
        return data;
    }

    serializeData() {
        const data = cloneDeep({
            formTabs: this.saveView(),
            formShared: {},
            upload: {},
            tabs: this.state.tabs,
        });
        for (const tab of this.state.tabs) {
            for (const fieldId of this.fieldIds) {
                if (this.fieldsFlat[fieldId].type === "files" && data.formTabs[tab][fieldId] && data.formTabs[tab][fieldId].length) {
                    for (let i = 0; i < data.formTabs[tab][fieldId].length; i += 1) {
                        if (data.formTabs[tab][fieldId][i].data) {
                            data.upload[data.formTabs[tab][fieldId][i].uid] = data.formTabs[tab][fieldId][i].data;
                        }
                        data.formTabs[tab][fieldId][i] = cloneDeep(data.formTabs[tab][fieldId][i]);
                        delete data.formTabs[tab][fieldId][i].data;
                    }
                }
            }
        }
        for (const sharedFieldId of this.sharedFieldIds) {
            for (const tab of this.state.tabs) {
                data.formShared[sharedFieldId] = data.formTabs[tab][sharedFieldId];
                delete data.formTabs[tab][sharedFieldId];
            }
        }
        return data;
    }

    deserializeData(data) {
        let tabs = Object.keys(data).filter(i => !i.match(/^_/));
        if (!tabs.length) {
            tabs = ["_default"];
        }
        const activeTab = tabs.length ? tabs[0] : "_default";
        this.setState("tabs", tabs);
        this.setState("activeTab", activeTab);
        if (data._shared) {
            for (const sharedFieldId of this.sharedFieldIds) {
                for (const tab of tabs) {
                    data[tab][sharedFieldId] = data._shared[sharedFieldId];
                }
            }
            delete data._shared;
        }
        this.deserializeView(data[activeTab]);
        this.focus();
    }

    getFormDataObject(serializedData) {
        const formData = new FormData();
        formData.append("formTabs", JSON.stringify(serializedData.formTabs));
        formData.append("formShared", JSON.stringify(serializedData.formShared));
        formData.append("tabs", JSON.stringify(serializedData.tabs));
        if (serializedData.upload) {
            for (const uk of Object.keys(serializedData.upload)) {
                serializedData.append(uk, serializedData.upload[uk]);
            }
        }
        return formData;
    }

    onTabDeleteClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const {
            id
        } = e.target.closest("[data-id]").dataset;
        const tabs = this.state.tabs.filter(t => t !== id);
        this.setState("tabs", tabs);
        const {
            data
        } = this.state;
        if (id === this.state.activeTab) {
            const prevTab = this.state.activeTab;
            this.copySharedFields(data, prevTab);
            const activeTab = tabs[0];
            this.setState("activeTab", activeTab);
            if (data[activeTab]) {
                this.deserializeView(data[activeTab]);
            } else {
                this.clearValues();
                this.setDefaultValues();
            }
        }
        delete data[id];
        this.setState("data", data);
        this.clearErrors();
    }

    setTab(id) {
        const data = cloneDeep(this.state.data);
        data[this.state.activeTab] = this.serializeView();
        const prevTab = this.state.activeTab;
        this.copySharedFields(data, prevTab);
        this.setState("activeTab", id);
        if (data[id]) {
            this.deserializeView(data[id]);
        } else {
            this.clearValues();
            this.setDefaultValues();
        }
        this.setState("data", data);
    }

    onTabClick(e) {
        e.preventDefault();
        e.stopPropagation();
        const {
            id
        } = e.target.closest("[data-id]").dataset;
        if (this.state.activeTab === id) {
            return;
        }
        this.setTab(id);
        this.clearErrors();
    }

    process() {
        this.clearErrors();
        const data = this.saveView();
        const validationResult = this.validate(data);
        if (validationResult) {
            const errorData = this.getErrorData(validationResult);
            this.setErrors(errorData);
            return null;
        }
        const serializedData = this.serializeData();
        return serializedData;
    }

    showNotification(message, css = "") {
        this.getComponent(`notify_field_${this.input.formId}`).show(window.__heretic.t(message), css);
    }

    setErrorMessage(message) {
        this.setState("errorMessage", message);
    }

    onNotify(data) {
        this.showNotification(data.message, data.css);
    }
};
