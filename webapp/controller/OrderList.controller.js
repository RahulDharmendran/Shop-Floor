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
                // If v1 is valid (truthy or 0), use it. Otherwise use v2.
                if (v1 !== null && v1 !== undefined && v1 !== "") {
                    return v1;
                }
                return v2;
            },

            date: function (sDate, sDate2) {
                // Determine which date value is valid (Prod or Planned)
                var sValue = sDate;
                if (!sValue || sValue === "") {
                    sValue = sDate2;
                }

                if (!sValue || sValue === '0000-00-00') {
                    return "";
                }

                try {
                    // Handle ASP.NET/OData JSON Date format "/Date(1750636800000)/"
                    if (typeof sValue === 'string' && sValue.indexOf("/Date(") !== -1) {
                        var sTimestamp = sValue.replace(/\/Date\((-?\d+)\)\//, '$1');
                        var d = new Date(parseInt(sTimestamp, 10));
                        return oDateFormat.format(d);
                    }

                    // Handle "yyyyMMdd" string (Standard ABAP date)
                    if (typeof sValue === 'string' && sValue.length === 8 && sValue.match(/^\d{8}$/)) {
                        sValue = sValue.substring(0, 4) + "-" + sValue.substring(4, 6) + "-" + sValue.substring(6, 8);
                    }

                    var d = new Date(sValue);
                    if (isNaN(d.getTime())) {
                        return sValue;
                    }
                    return oDateFormat.format(d);
                } catch (e) {
                    return sValue;
                }
            }
        },

        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("OrderList").attachPatternMatched(this._onRouteMatched, this);
        },

        // _updateColumnNames remains unchanged for header logic
        _updateColumnNames: function (sType) {
            var oTable = this.byId("ordersTable");
            if (!oTable) return;
            // ... (rest of the _updateColumnNames logic)
            var aColumns = oTable.getColumns();
            // Assuming the i18n model is available
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

            // Map column IDs to their generic i18n base keys
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
                // Safer way to get the local ID, avoiding issues with component IDs
                var sColumnId = oColumn.getId().split("---")[1];
                if (sColumnId) {
                    sColumnId = sColumnId.split("--").pop();
                } else {
                    sColumnId = oColumn.getId();
                }

                var oMapItem = aColumnMap.find(item => item.id === sColumnId);

                if (oMapItem) {
                    // Try to fetch a specific key (e.g., colOrderType_PLANNED)
                    var sSpecificKey = oMapItem.baseKey + "_" + sType;
                    var sHeaderText = oResourceBundle.getText(sSpecificKey);

                    // If specific key is not found (or equals the key itself), use the generic key
                    if (sHeaderText === sSpecificKey || !sHeaderText) {
                        sHeaderText = oResourceBundle.getText(oMapItem.baseKey);
                    }

                    // Update the Text control inside the column header
                    oColumn.getHeader().setText(sHeaderText);
                }
            });
        },


        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sEntitySet = oArgs.orderType;

            var sOrderType = sEntitySet.includes("PLANNED") ? "PLANNED" : "PRODUCTION";

            // Retrieve the Mode (Month/Year) from the global Component model
            var sMode = "Year"; // Default
            var oComponent = this.getOwnerComponent();
            var oFilterModel = oComponent.getModel("filterContext");
            if (oFilterModel) {
                sMode = oFilterModel.getProperty("/mode") || "Year";
            }

            // Set View Model for UI Visibility (Month toggle)
            var oViewModel = new JSONModel({
                mode: sMode
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Set Default Select Values (for when the user decides to filter)
            var dNow = new Date();
            this.byId("filterYear").setSelectedKey(dNow.getFullYear().toString());
            this.byId("filterMonth").setSelectedKey(dNow.getMonth().toString().padStart(2, '0'));

            var sEncodedFilter = oArgs.filter;
            var sFilterString = decodeURIComponent(sEncodedFilter);

            // Store these for the generic search function
            this._sEntitySet = sEntitySet;
            this._sUserFilterString = sFilterString;
            this._sOrderType = sOrderType;

            // Extract User Filter if present for navBack
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

            // Trigger initial search - USER ID FILTER ONLY (As requested: "User ID as usual")
            // We do NOT apply the date filter automatically. The user must click 'Go' to apply date filters.
            this._fetchData(sFilterString);
        },

        onFilterSearch: function () {
            var sYear = this.byId("filterYear").getSelectedKey();
            var sMonth = this.byId("filterMonth").getSelectedKey();
            var sMode = this.getView().getModel("viewModel").getProperty("/mode");

            var iYear = parseInt(sYear);
            var sStartDate, sEndDate;

            if (sMode === "Month") {
                var iMonth = parseInt(sMonth);
                // Create UTC dates to avoid timezone shifts
                var oStartDate = new Date(Date.UTC(iYear, iMonth, 1));
                var oEndDate = new Date(Date.UTC(iYear, iMonth + 1, 0, 23, 59, 59));

                sStartDate = oStartDate.toISOString().split('.')[0];
                sEndDate = oEndDate.toISOString().split('.')[0];
            } else {
                // Year Mode
                sStartDate = iYear + "-01-01T00:00:00";
                sEndDate = iYear + "-12-31T23:59:59";
            }

            // Determine Date Field
            var sDateField = (this._sOrderType === "PLANNED") ? "StartDate" : "Gstrp";

            var sDateFilter = sDateField + " ge datetime'" + sStartDate + "' and " + sDateField + " le datetime'" + sEndDate + "'";

            // Combine user filter with date filter
            var sFullFilter = this._sUserFilterString ? this._sUserFilterString + " and " + sDateFilter : sDateFilter;

            this._fetchData(sFullFilter);
        },

        _fetchData: function (sFilterString) {
            var oTable = this.byId("ordersTable");
            var oTemplate = this.byId("orderListItemTemplate").clone();

            // Using jQuery.ajax to bypass ODataModel's duplicate metadata ID issue
            var oModel = this.getOwnerComponent().getModel("orderModel");
            var sServiceUrl = oModel.sServiceUrl;

            // Ensure trailing slash
            if (!sServiceUrl.endsWith("/")) {
                sServiceUrl += "/";
            }

            // Only format=json is needed here, filter is appended below
            var sUrl = sServiceUrl + this._sEntitySet + "?$format=json";

            // Append filter if present (REQUIRED by backend to avoid 400 Bad Request)
            if (sFilterString) {
                sUrl += "&$filter=" + encodeURIComponent(sFilterString);
            }

            var that = this;
            oTable.setBusy(true);

            $.ajax({
                url: sUrl,
                method: "GET",
                dataType: "json",
                success: function (data) {
                    var aResults = (data && data.d && data.d.results) ? data.d.results : [];

                    // Client-side filtering REMOVED to show all data
                    var oJsonModel = new JSONModel({
                        results: aResults
                    });

                    oTable.setModel(oJsonModel, "jsonOrders");

                    oTable.unbindItems();
                    oTable.bindItems({
                        path: "jsonOrders>/results",
                        template: oTemplate
                    });

                    oTable.setBusy(false);
                },
                error: function (err) {
                    oTable.setBusy(false);
                    console.error("Failed to fetch data via AJAX", err);
                    // Fallback or error message could go here
                }
            });
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            var sUserIdToPass = this._sCurrentUserId || "GUEST";

            oRouter.navTo("RouteDashboard", {
                userId: sUserIdToPass
            });
        }
    });
});