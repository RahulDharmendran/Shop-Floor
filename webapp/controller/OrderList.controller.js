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
            date: function(sDate) {
                // ... (Formatter remains unchanged)
                if (!sDate || sDate === '0000-00-00') {
                    return "";
                }
                
                try {
                    if (typeof sDate === 'string' && sDate.length === 8 && sDate.match(/^\d{8}$/)) {
                        sDate = sDate.substring(0, 4) + "-" + sDate.substring(4, 6) + "-" + sDate.substring(6, 8);
                    }
                    
                    var d = new Date(sDate);
                    if (isNaN(d.getTime())) {
                        return sDate;
                    }
                    return oDateFormat.format(d);
                } catch (e) {
                    return sDate;
                }
            }
        },

        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("OrderList").attachPatternMatched(this._onRouteMatched, this);
        },
        
        // _updateColumnNames remains unchanged for header logic
        _updateColumnNames: function(sType) {
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

            aColumns.forEach(function(oColumn) {
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
            var sEncodedFilter = oArgs.filter; // e.g. "Ernam eq 'TRAINEE'"
            var sFilterString = decodeURIComponent(sEncodedFilter); 

            var oTable = this.byId("ordersTable");
            var oPage = this.byId("orderListPage");
            
            var sTitle = sOrderType === "PLANNED" ? "Planned Orders List" : "Production Orders List";
            oPage.setTitle(sTitle);
            
            this._updateColumnNames(sOrderType);

            // Create or get the template
            var oTemplate = this.byId("orderListItemTemplate").clone(); 
            
            // Extract User Filter if present
            var sUserFilterField = null;
            var sUserFilterValue = null;
            var sUserFilterOp = null;

            if (sFilterString) {
                var aParts = sFilterString.match(/(\w+)\s(eq|ne|gt|ge|lt|le)\s'([^']+)'/i);
                if (aParts && aParts.length >= 4) {
                    sUserFilterField = aParts[1]; 
                    sUserFilterOp = aParts[2].toUpperCase(); 
                    sUserFilterValue = aParts[3]; 

                    this._sCurrentUserId = sUserFilterValue; 
                }
            }

            // Using jQuery.ajax to bypass ODataModel's duplicate metadata ID issue
            var oModel = this.getOwnerComponent().getModel("orderModel");
            var sServiceUrl = oModel.sServiceUrl;
            
            // Ensure trailing slash
            if (!sServiceUrl.endsWith("/")) {
                sServiceUrl += "/";
            }

            var sUrl = sServiceUrl + sEntitySet + "?$format=json";

            var that = this;
            oTable.setBusy(true);

            $.ajax({
                url: sUrl,
                method: "GET",
                dataType: "json",
                success: function(data) {
                    var aResults = (data && data.d && data.d.results) ? data.d.results : [];
                    
                    // Client-side filtering
                    var aFilteredResults = aResults.filter(function(item) {
                        var bPassType = true;
                        var bPassUser = true;

                        // Filter by Order Type (PM vs PP)
                        if (sOrderType === "PLANNED") {
                            // Expecting PP orders
                            bPassType = (item.Aurt && item.Aurt.indexOf("PP") !== -1);
                        } else {
                            // Expecting PM orders (Production)
                            bPassType = (item.Aurt && item.Aurt.indexOf("PM") !== -1);
                        }

                        // Filter by User/Field if provided
                        if (sUserFilterField && sUserFilterValue) {
                            var sItemValue = item[sUserFilterField];
                            if (sUserFilterOp === "EQ") {
                                bPassUser = (sItemValue === sUserFilterValue);
                            }
                            // Add other operators if needed, currently only EQ is common
                        }

                        return bPassType && bPassUser;
                    });

                    var oJsonModel = new JSONModel({
                        results: aFilteredResults
                    });

                    oTable.setModel(oJsonModel, "jsonOrders");
                    
                    oTable.unbindItems();
                    oTable.bindItems({
                        path: "jsonOrders>/results",
                        template: oTemplate
                    });
                    
                    oTable.setBusy(false);
                },
                error: function(err) {
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