sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/UIComponent"
], function (Controller, MessageToast, MessageBox, BusyIndicator, UIComponent) {
    "use strict";

    return Controller.extend("shopfloor.controller.Login", {
        
        onInit: function() {
        },

        onLoginPress: function() {
            // 1. Get Inputs
            var sUser = this.getView().byId("idUser").getValue();
            var sPass = this.getView().byId("idPass").getValue();

            // 2. Validation
            if (!sUser || !sPass) {
                MessageToast.show("Please enter both User ID and Password");
                return;
            }

            // 3. Get Model
            // *** FIX HERE: Explicitly request the named model 'orderModel' ***
            var oModel = this.getOwnerComponent().getModel("orderModel");
            
            // Safety check for the model
            if (!oModel) {
                 MessageBox.error("OData model 'orderModel' is not loaded. Check manifest.json.");
                 return;
            }

            // 4. Construct Path for OData Read with Keys
            // Note: Since you are using a key-based read, the URL will be:
            // /ZRD_SF_LOGINSet(UserId='USER',Password='PASS')
            var sPath = "/ZRD_SF_LOGINSet(UserId='" + sUser + "',Password='" + sPass + "')";

            var that = this;
            BusyIndicator.show(0);

            // 5. Read OData Service
            oModel.read(sPath, {
                success: function(oData) {
                    BusyIndicator.hide();
                    
                    if (oData.Status === 'S') {
                        MessageToast.show(oData.StatusMsg || "Login Successful");
                        
                        // Navigate to Dashboard and PASS the authenticated User ID
                        var oRouter = UIComponent.getRouterFor(that);
                        oRouter.navTo("RouteDashboard", {
                            userId: sUser.toUpperCase() 
                        });
                    } else {
                        // Backend returned data but login failed (Status != 'S')
                        MessageBox.error(oData.StatusMsg || "Login Failed: Check Credentials");
                    }
                },
                error: function(oError) {
                    BusyIndicator.hide();
                    // Handle connection or service errors
                    try {
                        var oBody = JSON.parse(oError.responseText);
                        MessageBox.error(oBody.error.message.value);
                    } catch (e) {
                        MessageBox.error("Connection Failed. Please check network/destination.");
                    }
                }
            });
        }
    });
});