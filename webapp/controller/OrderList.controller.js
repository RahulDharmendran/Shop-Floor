sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Text",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, Filter, FilterOperator, Text, DateFormat, JSONModel) {
    "use strict";

    var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

    return Controller.extend("shopfloor.controller.OrderList", {

        _sCurrentUserId: null,

        formatter: {
            fallback: function (v1, v2) {
                if (v1 !== null && v1 !== undefined && v1 !== "") {
                    return v1;
                }
                if (v2 !== null && v2 !== undefined && v2 !== "") {
                    return v2;
                }
                return "NA";
            },

            date: function (sDate, sDate2) {
                var sValue = sDate;
                if (!sValue || sValue === "") {
                    sValue = sDate2;
                }

                if (!sValue || sValue === "" || sValue === "0000-00-00") {
                    return "NA";
                }

                try {
                    var oDate = null;
                    var sStrValue = String(sValue);

                    // 1. Handle OData JSON Date: "/Date(1750636800000)/"
                    if (sStrValue.indexOf("Date") !== -1) {
                        var aMatches = sStrValue.match(/-?\d+/);
                        if (aMatches) {
                            var iTimestamp = parseInt(aMatches[0], 10);
                            if (!isNaN(iTimestamp)) {
                                oDate = new Date(iTimestamp);
                            }
                        }
                    }
                    // 2. Handle "YYYYMMDD" (8 digits)
                    else if (sStrValue.length === 8 && /^\d{8}$/.test(sStrValue)) {
                        var y = parseInt(sStrValue.substring(0, 4), 10);
                        var m = parseInt(sStrValue.substring(4, 6), 10) - 1; // Month is 0-indexed
                        var d = parseInt(sStrValue.substring(6, 8), 10);
                        oDate = new Date(y, m, d);
                    }
                    // 3. Handle Standard Date String
                    else {
                        oDate = new Date(sStrValue);
                    }

                    if (oDate && !isNaN(oDate.getTime())) {
                        return oDateFormat.format(oDate);
                    }

                    // If parsing failed (e.g. Description text), return original value
                    return sValue;

                } catch (e) {
                    return sValue;
                }
            }
        },

        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("OrderList").attachPatternMatched(this._onRouteMatched, this);
        },

        _updateColumnNames: function (sType) {
            var oTable = this.byId("ordersTable");
            if (!oTable) return;

            var aColumns = oTable.getColumns();
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

            var aColumnMap = [
                { id: "colOrderNumber", baseKey: "colOrderNumber" },
                { id: "colMaterial", baseKey: "colMaterial" },
                { id: "colOrderType", baseKey: "colOrderType" },
                { id: "colPlant", baseKey: "colPlant" },
                { id: "colDescription", baseKey: "colDescriptionStatus" },
                { id: "colStartDate", baseKey: "colStartDate" },
                { id: "colEndDate", baseKey: "colEndDate" },
                { id: "colQuantity", baseKey: "colQuantity" },
                { id: "colUnit", baseKey: "colUnit" },
                { id: "colCreator", baseKey: "colCreator" },
                { id: "colStockCreation", baseKey: "colStockCreationDate" },
                { id: "colProdPlant", baseKey: "colProdPlantObjnr" },
                { id: "colMrpFtrmi", baseKey: "colMrpFtrmi" },
                { id: "colFtrmp", baseKey: "colFtrmp" }
            ];

            aColumns.forEach(function (oColumn) {
                var sColumnId = oColumn.getId().split("---")[1];
                if (sColumnId) {
                    sColumnId = sColumnId.split("--").pop();
                } else {
                    sColumnId = oColumn.getId();
                }

                var oMapItem = aColumnMap.find(item => item.id === sColumnId);

                if (oMapItem) {
                    var sSpecificKey = oMapItem.baseKey + "_" + sType;
                    var sHeaderText = oResourceBundle.getText(sSpecificKey);

                    if (sHeaderText === sSpecificKey || !sHeaderText) {
                        sHeaderText = oResourceBundle.getText(oMapItem.baseKey);
                    }
                    oColumn.getHeader().setText(sHeaderText);
                }
            });
        },


        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sEntitySet = oArgs.orderType;

            var sOrderType = sEntitySet.includes("PLANNED") ? "PLANNED" : "PRODUCTION";

            var sMode = "Year";
            var oComponent = this.getOwnerComponent();
            var oFilterModel = oComponent.getModel("filterContext");
            if (oFilterModel) {
                sMode = oFilterModel.getProperty("/mode") || "Year";
            }

            var oViewModel = new JSONModel({
                mode: sMode
            });
            this.getView().setModel(oViewModel, "viewModel");

            var dNow = new Date();
            this.byId("filterYear").setSelectedKey(dNow.getFullYear().toString());
            this.byId("filterMonth").setSelectedKey((dNow.getMonth() + 1).toString());

            var sEncodedFilter = oArgs.filter;
            var sFilterString = decodeURIComponent(sEncodedFilter);

            this._sEntitySet = sEntitySet;
            this._sUserFilterString = sFilterString;
            this._sOrderType = sOrderType;

            if (sFilterString) {
                var aParts = sFilterString.match(/(\w+)\s(eq|ne|gt|ge|lt|le)\s'([^']+)'/i);
                if (aParts && aParts.length >= 4) {
                    this._sCurrentUserId = aParts[3];
                }
            }

            var oTable = this.byId("ordersTable");
            var oPage = this.byId("orderListPage");

            var sTitle = sOrderType === "PLANNED" ? "Planned Orders List" : "Production Orders List";
            oPage.setTitle(sTitle);

            this._updateColumnNames(sOrderType);

            this._fetchData(sFilterString);
        },

        onFilterSearch: function () {
            var sYear = parseInt(this.byId("filterYear").getSelectedKey(), 10);
            var sMonth = parseInt(this.byId("filterMonth").getSelectedKey(), 10);
            var sMode = this.getView().getModel("viewModel").getProperty("/mode");

            var aFilters = [];

            // Year Filter
            aFilters.push(new Filter("_FilterYear", FilterOperator.EQ, sYear));

            // Month Filter
            if (sMode === "Month") {
                aFilters.push(new Filter("_FilterMonth", FilterOperator.EQ, sMonth));
            }

            var oTable = this.byId("ordersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },

        _fetchData: function (sFilterString) {
            var oTable = this.byId("ordersTable");
            oTable.setBusy(true);

            var sUrl = "/sap/opu/odata/sap/ZRD_SF_PROJ_SRV/" + this._sEntitySet + "?$format=json";

            if (sFilterString) {
                sUrl += "&$filter=" + encodeURIComponent(sFilterString);
            }

            var that = this;
            jQuery.ajax({
                url: sUrl,
                type: "GET",
                dataType: "json",
                success: function (oData) {

                    if (oData && oData.d && oData.d.results) {
                        oData.d.results.forEach(function (oItem) {
                            var oDate = null;
                            var sValue = oItem.StartDate || oItem.Gstrp || oItem.PlanningStatus;

                            if (sValue) {
                                var sStrValue = String(sValue);
                                if (sStrValue.indexOf("Date") !== -1) {
                                    var aMatches = sStrValue.match(/-?\d+/);
                                    if (aMatches) {
                                        var iTimestamp = parseInt(aMatches[0], 10);
                                        if (!isNaN(iTimestamp)) {
                                            oDate = new Date(iTimestamp);
                                        }
                                    }
                                } else if (sStrValue.length === 8 && /^\d{8}$/.test(sStrValue)) {
                                    var y = parseInt(sStrValue.substring(0, 4), 10);
                                    var m = parseInt(sStrValue.substring(4, 6), 10) - 1;
                                    var d = parseInt(sStrValue.substring(6, 8), 10);
                                    oDate = new Date(y, m, d);
                                } else {
                                    oDate = new Date(sStrValue);
                                }
                            }

                            if (oDate && !isNaN(oDate.getTime())) {
                                oItem._FilterYear = oDate.getFullYear();
                                oItem._FilterMonth = oDate.getMonth() + 1;
                            }
                        });
                    }

                    var oViewModel = new JSONModel(oData);
                    oViewModel.setSizeLimit(5000);
                    that.getView().setModel(oViewModel, "jsonOrders");

                    if (!oTable.getBindingInfo("items")) {
                        var oTemplate = that.byId("orderListItemTemplate");
                        if (oTemplate) {
                            oTable.bindItems({
                                path: "jsonOrders>/d/results",
                                template: oTemplate
                            });
                        }
                    }

                    oTable.setBusy(false);
                },
                error: function (oError) {
                    oTable.setBusy(false);
                }
            });
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDashboard", {
                userId: this._sCurrentUserId || "TRAINEE"
            });
        }
    });
});
