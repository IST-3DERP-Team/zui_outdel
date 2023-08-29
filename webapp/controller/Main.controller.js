sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";
        
        var _this;
        var _oCaption = {};
        var _dlvNo = "";
        var _aRefDlvNo = [];
        var _aSmartFilter;
        var _sSmartFilterGlobal;
        var _aTableProp = [];

        return BaseController.extend("zuioutdel.controller.Main", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteMain").attachPatternMatched(this._routePatternMatched, this);

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_OUTDELFILTER_CDS");
                var oSmartFilter = this.getView().byId("sfbOutDel");
                oSmartFilter.setModel(oModel);
            },

            _routePatternMatched: function (oEvent) {
                _this.initializeComponent();

                if (sap.ui.getCore().byId("backBtn")) {
                    sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function(oEvent) {
                        _this.onNavBack();
                    }
                }
            },

            initializeComponent() {
                this.getView().setModel(new JSONModel({
                    sbu: "VER",
                    activeDlvNo: ""
                }), "ui");

                this.onInitBase(_this, _this.getView().getModel("ui").getData().sbu);
                this.getAppAction();

                _this.showLoadingDialog("Loading...");

                _aTableProp.push({
                    modCode: "OUTDELHDRMOD",
                    tblSrc: "ZDV_OUTDEL",
                    tblId: "outDelHdrTab",
                    tblModel: "outDelHdr"
                });

                _aTableProp.push({
                    modCode: "OUTDELDTLMOD",
                    tblSrc: "ZDV_OUTDELDTL",
                    tblId: "outDelDtlTab",
                    tblModel: "outDelDtl"
                });

                _this.getColumns(_aTableProp);

                _this.getRefDlvNo();

                var aSmartFilter = this.getView().byId("sfbOutDel").getFilters();
                if (aSmartFilter.length == 0) {
                    // Header button
                    this.byId("btnAddOutDelHdr").setEnabled(false);
                    this.byId("btnEditOutDelHdr").setEnabled(false);
                    this.byId("btnRefreshOutDelHdr").setEnabled(false);

                    // Detail button
                    this.byId("btnRefreshOutDelDtl").setEnabled(false);
                }

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("outDelHdrTab").addEventDelegate(oTableEventDelegate);
                this.byId("outDelDtlTab").addEventDelegate(oTableEventDelegate);

                // Double click
                var oTable = this.getView().byId("outDelHdrTab");

                if (!oTable.aBindParameters || oTable.aBindParameters.filter(x => x.sEventType == "dblclick").length == 0) {
                    oTable.attachBrowserEvent('dblclick', function (e) {
                        e.preventDefault();
    
                        // _this._router.navTo("RouteInterplantTransferDC", {
                        //     sbu: _this.getView().getModel("ui").getData().sbu,
                        //     dlvNo: _dlvNo
                        // });
    
                        _this.onLockOutDel();
                    });
                }
                
                this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId, pTableProps) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aSmartFilter = this.getView().byId("sfbOutDel").getFilters();
                var sSmartFilterGlobal = "";
                if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                _aSmartFilter = aSmartFilter;
                _sSmartFilterGlobal = sSmartFilterGlobal;

                this.getOutDelHdr(aSmartFilter, sSmartFilterGlobal);

                this.byId("btnAddOutDelHdr").setEnabled(true);
                this.byId("btnEditOutDelHdr").setEnabled(true);
                this.byId("btnRefreshOutDelHdr").setEnabled(true);
                this.byId("btnRefreshOutDelDtl").setEnabled(true);
            },

            getOutDelHdr(pFilters, pFilterGlobal) {
                _this.showLoadingDialog("Loading...");

                var oModel = this.getOwnerComponent().getModel();
                var oTable = _this.getView().byId("outDelHdrTab");

                oModel.read('/OutDelHeaderSet', {
                    success: function (data, response) {
                        console.log("OutDelHeaderSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach(item => {
                                if (item.PLANDLVDT !== null)
                                    item.PLANDLVDT = _this.formatDate(item.PLANDLVDT)

                                if (item.DOCDT !== null)
                                    item.DOCDT = _this.formatDate(item.DOCDT)

                                if (item.POSTDT !== null)
                                    item.POSTDT = _this.formatDate(item.POSTDT)

                                if (item.REFDOCDT !== null)
                                    item.REFDOCDT = _this.formatDate(item.REFDOCDT)

                                if (item.ETD !== null)
                                    item.ETD = _this.formatDate(item.ETD)

                                if (item.ETA !== null)
                                    item.ETA = _this.formatDate(item.ETA)

                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = _this.formatDate(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = _this.formatDate(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);

                                // Add Reference Delivery Number
                                if (_aRefDlvNo.filter(i => i.DLVNO == item.DLVNO).length > 0) {
                                    var iRefDlvNo = _aRefDlvNo.findIndex(i => i.DLVNO == item.DLVNO);
                                    item.REFDLVNO = _aRefDlvNo[iRefDlvNo].REFDLVNO;
                                } else {
                                    item.REFDLVNO = "";
                                }
                                
                            })

                            var aFilterTab = [];
                            if (oTable.getBinding("rows")) {
                                aFilterTab = oTable.getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "outDelHdr");
                            _this._tableRendered = "outDelHdrTab";

                            _this.onFilterBySmart("outDelHdr", pFilters, pFilterGlobal, aFilterTab);

                            _this.setRowReadMode("outDelHdr");
                        }

                        oTable.getColumns().forEach((col, idx) => {   
                            if (col._oSorter) {
                                oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                            }
                        });

                        if (oTable.getBinding("rows").aIndices.length > 0) {
                            var aIndices = oTable.getBinding("rows").aIndices;
                            var sDlvNo = _this.getView().getModel("outDelHdr").getData().results[aIndices[0]].DLVNO;
                            _this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);
                            _this.getOutDelDtl();
                        } else {
                            _this.getView().getModel("ui").setProperty("/activeDlvNo", "");
                            _this.getView().getModel("outDelDtl").setProperty("/results", []);
                        }
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getOutDelDtl() {
                var oModel = this.getOwnerComponent().getModel();
                var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;
                oModel.read('/OutDelDetailSet', {
                    urlParameters: {
                        "$filter": "DLVNO eq '" + sDlvNo + "'"
                    },
                    success: function (data, response) {
                        console.log("OutDelDetailSet", data)
                        if (data.results.length > 0) {

                            data.results.forEach(item => {
                                if (item.CREATEDDT !== null)
                                    item.CREATEDDT = _this.formatDate(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                                if (item.UPDATEDDT !== null)
                                    item.UPDATEDDT = _this.formatDate(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);
                            })

                            var aFilterTab = [];
                            if (_this.getView().byId("outDelDtlTab").getBinding("rows")) {
                                aFilterTab = _this.getView().byId("outDelDtlTab").getBinding("rows").aFilters;
                            }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "outDelDtl");
                            _this._tableRendered = "outDelDtlTab";

                            if (aFilterTab.length > 0) {
                                aFilterTab.forEach(item => {
                                    var iColIdx = _this._aColumns["outDelDtl"].findIndex(x => x.name == item.sPath);
                                    _this.getView().byId(outDelDtlTab).filter(_this.getView().byId(outDelDtlTab).getColumns()[iColIdx], 
                                        item.oValue1);
                                });
                            }

                            _this.setRowReadMode("outDelDtl");
                        } else {
                            _this.getView().setModel(new JSONModel({
                                results: []
                            }), "outDelDtl");
                        }

                        var oTable = _this.getView().byId("outDelDtlTab");
                        oTable.getColumns().forEach((col, idx) => {   
                            if (col._oSorter) {
                                oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                            }
                        });
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getRefDlvNo() {
                var oModel = _this.getOwnerComponent().getModel();

                oModel.read('/RefDlvNoSet', {
                    success: function (data, response) {
                        console.log("RefDlvNoSet", data)
                        if (data.results.length > 0) {
                            var aRefDlvNo = [];
                            data.results.forEach(item => {
                                if (aRefDlvNo.filter(x => x.DLVNO == item.DLVNO) == 0) {
                                    var oRefDlvNo = {
                                        DLVNO: item.DLVNO,
                                        REFDLVNO: item.REFDLVNO
                                    }
                                    aRefDlvNo.push(oRefDlvNo);
                                } else {
                                    var iIdx = aRefDlvNo.findIndex(x => x.DLVNO == item.DLVNO);
                                    aRefDlvNo[iIdx].REFDLVNO = aRefDlvNo[iIdx].REFDLVNO + "," + item.REFDLVNO
                                }
                            });

                            _aRefDlvNo = aRefDlvNo;
                        }
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onAddOutDelHdr() {
                this._router.navTo("RouteInterplantTransferDC", {
                    sbu: _this.getView().getModel("ui").getData().sbu,
                    dlvNo: "empty"
                });
            },

            onEditOutDelHdr() {
                // if (this.getView().getModel("ui").getData().activeDlvNo) {
                //     var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;
                //     this._router.navTo("RouteInterplantTransferDC", {
                //         sbu: _this.getView().getModel("ui").getData().sbu,
                //         dlvNo: sDlvNo
                //     });
                // } else {
                //     MessageBox.information(_oCaption.INFO_NO_SELECTED);
                // }

                _this.onLockOutDel();
            },

            onRefreshOutDelHdr() {
                _this.getOutDelHdr(_aSmartFilter, _sSmartFilterGlobal);
            },

            onRefreshOutDelDtl() {
                _this.showLoadingDialog("Loading...");
                _this.getOutDelDtl();
            },

            onNavBack() {
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");  
                oCrossAppNavigator.toExternal({  
                    target: { shellHash: "#Shell-home" }  
                }); 
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "";
                    if (oTable.getId().indexOf("outDelHdrTab") >= 0) sModel = "outDelHdr";
                    else if (oTable.getId().indexOf("outDelDtlTab") >= 0) sModel = "outDelDtl";

                    if (sModel == "outDelHdr") {
                        var sRowId = this.byId(oEvent.srcControl.sId);
                        var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["outDelHdr"].sPath;
                        var oRow = this.getView().getModel("outDelHdr").getProperty(sRowPath);
                        var sDlvNo = oRow.DLVNO;
                        this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);

                        this.getOutDelDtl();
                    }

                    if (this.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;

                        oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            onLockOutDel() {
                if (this.getView().getModel("ui").getData().activeDlvNo) {
                    var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;
                    var bAppChange = _this.getView().getModel("base").getProperty("/appChange");

                    if (bAppChange) {
                        _this.showLoadingDialog("Loading...");
                        var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
    
                        var oParamLock = {
                            Dlvno: sDlvNo,
                            Lock_Unlock_Ind: "X",
                            IV_Count: 300,
                            N_LOCK_UNLOCK_DLVHDR_RET: [],
                            N_LOCK_UNLOCK_DLVHDR_MSG: []
                        }
    
                        oModelLock.create("/Lock_Unlock_DlvHdrSet", oParamLock, {
                            method: "POST",
                            success: function(data, oResponse) {
                                console.log("Lock_Unlock_DlvHdrSet", data);
                                _this.closeLoadingDialog();

                                if (data.N_LOCK_UNLOCK_DLVHDR_MSG.results.filter(x => x.Type != "S").length == 0) {
                                    _this._router.navTo("RouteInterplantTransferDC", {
                                        sbu: _this.getView().getModel("ui").getData().sbu,
                                        dlvNo: sDlvNo
                                    });
                                } else {
                                    var oFilter = data.N_LOCK_UNLOCK_DLVHDR_MSG.results.filter(x => x.Type != "S")[0];
                                    MessageBox.warning(oFilter.Message);
                                    
                                }
                            },
                            error: function(err) {
                                MessageBox.error(err);
                                _this.closeLoadingDialog();
                            }
                        });
                    } else {
                        _this._router.navTo("RouteInterplantTransferDC", {
                            sbu: _this.getView().getModel("ui").getData().sbu,
                            dlvNo: sDlvNo
                        });
                    }
                } else {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                }
            },

            onCellClickOutDelHdr(oEvent) {
                var sDlvNo = oEvent.getParameters().rowBindingContext.getObject().DLVNO;
                this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);
                _dlvNo = sDlvNo;

                this.onCellClick(oEvent);

                this.getOutDelDtl();

                // Clear Sort and Filter
                this.clearSortFilter("outDelDtlTab");
            },

            onRowSelectionChangeOutDelHdr(oEvent) {
                var sPath = oEvent.getParameter("rowContext").getPath();
                var oData = _this.getView().getModel("outDelHdr").getProperty(sPath);
                _dlvNo = oData.DLVNO;
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("outDelHdrTab") >= 0) {
                        sModel = "outDelHdr";
                    }
                    else if (oTable.getId().indexOf("outDelDtlTab") >= 0) {
                        sModel = "outDelDtl";
                    }

                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "SBU"});
                oDDTextParam.push({CODE: "DLVTYPE"});
                oDDTextParam.push({CODE: "DLVNO"});
                oDDTextParam.push({CODE: "ISSPLANT"});
                oDDTextParam.push({CODE: "RCVPLANT"});
                oDDTextParam.push({CODE: "REFDLVNO"});

                // Label
                oDDTextParam.push({CODE: "DLVDTL"});

                // Buttons
                oDDTextParam.push({CODE: "NEW"});
                oDDTextParam.push({CODE: "DISPLAY_EDIT"});
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "EDIT"});
                oDDTextParam.push({CODE: "REFRESH"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                // oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                // oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                // oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                // oDDTextParam.push({CODE: "INFO_CREATE_DATA_NOT_ALLOW"});
                // oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                // oDDTextParam.push({CODE: "INFO_NO_DELETE_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_USE_GMC_REQ"});
                // oDDTextParam.push({CODE: "INFO_ALREADY_EXIST"});
                // oDDTextParam.push({CODE: "INFO_PROCEED_DELETE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        // console.log(oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "ddtext");

                        _oCaption = _this.getView().getModel("ddtext").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
