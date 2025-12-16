sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, MessageToast, UIComponent) {
    "use strict";
    
    // Hardcoded global variable 'sLoggedInUser' is REMOVED.
    
    return Controller.extend("shopfloor.controller.Dashboard", {
        
        onInit: function() {
            // Get router and attach event handler to capture parameters when this route is navigated to
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteDashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function(oEvent) {
            // 🌟 STEP: Retrieve the userId parameter from the route arguments
            var oArgs = oEvent.getParameter("arguments");
            // Store the User ID for use in all navigation handlers
            this._sLoggedInUser = oArgs.userId; 

            // Handle scenario where userId might be missing (e.g., direct access)
            if (!this._sLoggedInUser) {
                 MessageToast.show("Warning: User ID not provided on navigation.");
                 // Optionally force a redirect to login if user ID is mandatory
            }
        },

        // Generic function to navigate and pass filter parameters (Simplified)
        _navigateToOrderList: function(sEntitySet, sCreatorField, sCreatorValue) {
            
            // sCreatorValue now uses the dynamically captured user ID (this._sLoggedInUser)
            var sFilter = sCreatorField + " eq '" + sCreatorValue + "'"; 

            MessageToast.show("Applying Filter: " + sFilter);

            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("OrderList", {
                orderType: sEntitySet,
                filter: encodeURIComponent(sFilter) 
            });
        },

        // --- Navigation Handlers (Updated to use this._sLoggedInUser) ---

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },
        
        // Planned uses 'Creator'
        onPressPlannedMonth: function() {
            this._navigateToOrderList(
                "ZRD_SF_PLANNEDSet", 
                "Creator", 
                this._sLoggedInUser // 🌟 USING PROPERTY
            );
        },
        
        onPressPlannedYear: function() {
            this._navigateToOrderList(
                "ZRD_SF_PLANNEDSet", 
                "Creator", 
                this._sLoggedInUser // 🌟 USING PROPERTY
            );
        },
        
        // Production uses 'Ernam'
        onPressProdMonth: function() {
            this._navigateToOrderList(
                "ZRD_SF_PRODUCTIONSet", 
                "Ernam", 
                this._sLoggedInUser // 🌟 USING PROPERTY
            );
        },
        
        // Production uses 'Ernam'
        onPressProdYear: function() {
            this._navigateToOrderList(
                "ZRD_SF_PRODUCTIONSet", 
                "Ernam", 
                this._sLoggedInUser // 🌟 USING PROPERTY
            );
        }
    });
});