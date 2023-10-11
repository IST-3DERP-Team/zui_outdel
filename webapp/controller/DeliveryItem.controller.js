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
	'sap/m/SearchField',
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
     function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField, History) {
        "use strict";

        var _this;
        var _oCaption = {};
        var _aColumns = {};
        var _aSmartFilter;
        var _sSmartFilterGlobal;
        var _aTableProp = [];

        return BaseController.extend("zuioutdel.controller.DeliveryItem", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteDeliveryItem").attachPatternMatched(this._routePatternMatched, this);

                var oModel = _this.getOwnerComponent().getModel("ZVB_3DERP_OUTDELHUFILTER_CDS");
                var oSmartFilter = _this.getView().byId("sfbDlvItem");
                oSmartFilter.setModel(oModel);
            },

            _routePatternMatched: function (oEvent) {
                this.getView().setModel(new JSONModel({
                    sbu: oEvent.getParameter("arguments").sbu,
                    activeDlvNo: oEvent.getParameter("arguments").dlvNo,
                    activeIssPlant: oEvent.getParameter("arguments").issPlant,
                    activeRcvPlant: oEvent.getParameter("arguments").rcvPlant,
                    activeMatTypeGrp: oEvent.getParameter("arguments").matTypeGrp,
                    rowCount: 0
                }), "ui");

                _this.initializeComponent();

                if (sap.ui.getCore().byId("backBtn")) {
                    sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function(oEvent) {
                        _this.onNavBack();
                    }
                }
            },

            initializeComponent() {
                var sSbu = _this.getView().getModel("ui").getProperty("/sbu");
                this.onInitBase(_this, sSbu);

                _this.showLoadingDialog("Loading...");

                _aTableProp.push({
                    modCode: "OUTDELDLVITEMMOD",
                    tblSrc: "ZDV_OUTDELDLVHU",
                    tblId: "dlvItemTab",
                    tblModel: "dlvItem"
                });

                _this.getColumns(_aTableProp);

                setTimeout(() => {
                    var oFilterBar = _this.byId("sfbDlvItem");
                    var oFilterData = oFilterBar.getFilterData();
                    
                    if (oFilterData) {
                        oFilterBar.setFilterData({}, true);
                    }
                }, 300);

                _this.getDlvDtlHU();

                _this.getView().setModel(new JSONModel({
                    results: []
                }), "dlvItem");

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("dlvItemTab").addEventDelegate(oTableEventDelegate);

                this.clearSortFilter("dlvItemTab");
                this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId, pTableProps) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aSmartFilter = this.getView().byId("sfbDlvItem").getFilters();
                var sSmartFilterGlobal = "";
                if (oEvent) sSmartFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;

                _aSmartFilter = aSmartFilter;
                _sSmartFilterGlobal = sSmartFilterGlobal;
                
                this.getDlvItem(aSmartFilter, sSmartFilterGlobal);

                this.byId("btnAdd").setEnabled(true);
                this.byId("btnCancel").setEnabled(true);
            },

            getDlvItem(pFilters, pFilterGlobal) {
                var oModel = this.getOwnerComponent().getModel();
                var oTable = _this.getView().byId("dlvItemTab");
                var sDlvNo = "";
                var sIssPlant = _this.getView().getModel("ui").getData().activeIssPlant;
                var sRcvPlant = _this.getView().getModel("ui").getData().activeRcvPlant;
                var sDirectionCd = "IN";
                var sDlvAsgnd = "";
                var sMatTypeGrp = _this.getView().getModel("ui").getData().activeMatTypeGrp;

                var sFilter = "DLVNO eq '" + sDlvNo + "' and PLANT eq '" + sIssPlant + "' and SHIPTOPLANT eq '" + sRcvPlant + 
                    "' and DIRECTIONCD eq '" + sDirectionCd + "' and DLVASGND eq '" + sDlvAsgnd + "' and MATGRP eq '" + sMatTypeGrp + "'";
                //console.log("getDlvItem", sFilter)
                oModel.read('/DlvDetailHUSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvDetailHUSet", data)

                        data.results.forEach((item, idx) => {
                            if (idx == 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })

                        var aFilterTab = [];
                        if (oTable.getBinding("rows")) {
                            aFilterTab = oTable.getBinding("rows").aFilters;
                        }

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvItem");
                        _this._tableRendered = "dlvItemTab";

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCount", data.results.length);

                        _this.onFilterBySmart("dlvItem", pFilters, pFilterGlobal, aFilterTab);

                        _this.setRowReadMode("dlvItem");

                        // oTable.getColumns().forEach((col, idx) => {   
                        //     if (col._oSorter) {
                        //         oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                        //     }
                        // });

                        // if (oTable.getBinding("rows").aIndices.length > 0) {
                        //     var aIndices = oTable.getBinding("rows").aIndices;
                        //     var sDlvNo = _this.getView().getModel("outDelHdr").getData().results[aIndices[0]].DLVNO;
                        //     _this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);
                        //     _this.getOutDelDtl();
                        // } else {
                        //     _this.getView().getModel("ui").setProperty("/activeDlvNo", "");
                        //     _this.getView().getModel("outDelDtl").setProperty("/results", []);
                        // }
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getDlvDtlHU() {
                var oModel = this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;

                var sFilter = "DLVNO eq '" + sDlvNo + "'";
                oModel.read('/DlvDetailHUSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvDetailHUSet", data)

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvDtlHU");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onAdd() {
                var oTable = this.byId("dlvItemTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();
                var aData = _this.getView().getModel("dlvItem").getData().results;
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var iIdx = 0;

                var aDlvDtlHU = _this.getView().getModel("dlvDtlHU").getData().results;
                var iMaxDlvItem = 0;
                var iMaxSeqNo = 0;
                if (aDlvDtlHU.length > 0) {
                    iMaxDlvItem = Math.max(...aDlvDtlHU.map(x => x.DLVITEM));
                    iMaxSeqNo = Math.max(...aDlvDtlHU.map(x => x.SEQNO));
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                aOrigSelIdx.forEach(i => {
                    var oData = aData[i];
                    var sEntitySet = "/DlvDetailHUTblSet(DLVNO='" + oData.DLVNO + "',DLVITEM='" + oData.DLVITEM + "',SEQNO='" + oData.SEQNO + "')";
                    var param = {
                        DLVASGND: sDlvNo
                    }

                    setTimeout(() => {
                        oModel.update(sEntitySet, param, {
                            method: "PUT",
                            success: function(data, oResponse) {
                                console.log(sEntitySet, data, oResponse)
    
                                var oDataCreate = oData; //aData[iIdx];
                                
                                // DlvTem
                                var iDlvItem = parseInt(oDataCreate.DLVITEM);
                                iMaxDlvItem = iDlvItem;
                                /*if (iMaxDlvItem == 0) iMaxDlvItem = iDlvItem;
                                else if (iMaxDlvItem > iDlvItem) iMaxDlvItem += 1;
                                else iMaxDlvItem = iDlvItem + 1;*/
    
                                // SeqNo
                                var iSeqNo = parseInt(oDataCreate.SEQNO);
                                if (iMaxSeqNo == 0) iMaxSeqNo = iSeqNo;
                                else if (iMaxSeqNo > iSeqNo) iMaxSeqNo += 1;
                                else iMaxSeqNo = iSeqNo + 1;
    
                                var paramCreate = {
                                    DLVNO: sDlvNo,
                                    DLVITEM: iMaxDlvItem.toString(), //.toString().padStart(5, '0'),
                                    SEQNO: iMaxSeqNo.toString(), //.toString().padStart(4, '0'),
                                    PLANTCD: oDataCreate.PLANT,
                                    SLOC: oDataCreate.SLOC,
                                    MATNO: oDataCreate.MATNO,
                                    BATCH: oDataCreate.NEWBATCH,
                                    PKGNO: oDataCreate.PACKNO,
                                    HUID: oDataCreate.HUID,
                                    HUITEM: oDataCreate.HUITEM,
                                    DLVQTYORD: oDataCreate.ACTQTYBASE,
                                    DLVQTYBSE: oDataCreate.ACTQTYBASE,
                                    ORDUOM: oDataCreate.BASEUOM,
                                    BASEUOM: oDataCreate.BASEUOM,
                                    ACTQTYORD: oDataCreate.ACTQTYBASE,
                                    ACTQTYBSE: oDataCreate.ACTQTYBASE
                                };
    
                                console.log("paramCreate", paramCreate);
                                oModel.create("/DlvDetailHUTblSet", paramCreate, {
                                    method: "POST",
                                    success: function(data, oResponse) {
                                        console.log("DlvDetailHUTblSet create", data)
                                    },
                                    error: function(err) {
                                        console.log("error", err)
                                    }
                                });
    
    
                                iIdx++;
                                if (iIdx === aOrigSelIdx.length) {
                                    _this.onSaveDlvDtl();
                                }
    
                            },
                            error: function(err) {
                                console.log("error", err)
                            }
                        });
                    }, 100);
                    
                })

                //console.log("onAdd", aOrigSelIdx)


                // this._router.navTo("RouteInterplantTransferDC", {
                //     sbu: _this.getView().getModel("ui").getData().sbu,
                //     dlvNo: _this.getView().getModel("ui").getData().activeDlvNo
                // }, true);
            },            

            onSaveDlvDtl() {
                var oModel = this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;

                var sFilter = "DLVASGND eq '" + sDlvNo + "'";
                console.log("onSaveDlvDtl", sFilter)
                oModel.read('/HUToDetailSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("HUToDetailSet", data)
                        _this.onClose();
                        
                        // if (data.results.length > 0) {
                        //     var iDlvItemMax = parseInt(data.results[0].DLVITEMMAX);
                        //     var iDlvItem = 0;
                        //     var iIdx = 0;
                        //     var iIdxMax = data.results.length;

                        //     data.results.forEach(item => {

                        //         if (parseInt(item.DLVITEM) > 0) {
                        //             iDlvItem = parseInt(item.DLVITEM);
                        //         } else {
                        //             iDlvItemMax += 1;
                        //             iDlvItem = iDlvItemMax;
                        //         }

                        //         var oModel = _this.getOwnerComponent().getModel();
                        //         var sEntitySet = "/DlvDetailTblSet(DLVNO='" + sDlvNo + "',DLVITEM='" + 
                        //             iDlvItem.toString().padStart(5, '0') + "')";

                        //         var param = {
                        //             DLVNO: sDlvNo,
                        //             DLVITEM: iDlvItem.toString().padStart(5, '0'),
                        //             PLANTCD: item.PLANTCD,
                        //             SLOC: item.SLOC,
                        //             MATNO: item.MATNO,
                        //             BATCH: item.BATCH,
                        //             IONO: item.IONO,
                        //             VENDBATCH: item.DYELOT,
                        //             GRADE: item.GRADE,
                        //             NEWBATCH: item.NEWBATCH,
                        //             EBELN: item.PONO,
                        //             EBELP: item.POITEM,
                        //             DLVQTYORD: item.DLVQTYORD,
                        //             DLVQTYBSE: item.DLVQTYBASE,
                        //             ORDUOM: item.ORDUOM,
                        //             BASEUOM: item.BASEUOM,
                        //             ACTQTYORD: item.ACTQTYORD,
                        //             ACTQTYBSE: item.ACTQTYBASE,
                        //             TRANCURR: item.COSTCURR,
                        //             SHIPTOPLANT: item.SHIPTOPLANT,
                        //             REFDLVNO: item.REFDLVNO,
                        //             REFDLVITEM: item.REFDLVITEM
                        //         }

                        //         console.log("DlvDetailTblSet update", sEntitySet, param)
                        //         //setTimeout(() => {
                        //             oModel.update(sEntitySet, param, {
                        //                 method: "PUT",
                        //                 success: function(data, oResponse) {
                        //                     console.log(sEntitySet, data, oResponse)
                        //                     //console.log("done...", iIdx)
                        //                     iIdx++;
                        //                     if (iIdx === iIdxMax) {
                        //                         _this.onClose()
                        //                     }
                
                        //                 },
                        //                 error: function(err) {
                        //                     console.log("error", err)
                        //                 }
                        //             });
                        //         //}, 500);
                        //     })
                        // }
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onCancel() {
                MessageBox.confirm(_oCaption.INFO_PROCEED_CLOSE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            _this.onClose();                        
                        }
                    }
                });
            },

            onNavBack() {
                _this.onClose();
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "dlvItem";

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

            onClose() {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // var oComponent = _this.getOwnerComponent();
                // var oRouter = oComponent.getRouter();

                var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;

                oRouter.navTo("RouteInterplantTransferDC", {
                    sbu: _this.getView().getModel("ui").getData().sbu,
                    dlvNo: sDlvNo
                }, true);
                
                // var oHistory = History.getInstance();
			    // var sPreviousHash = oHistory.getPreviousHash();

                // if (sPreviousHash !== undefined) {
                //     window.history.go(-1);
                // } else {
                //     var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                //     var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;

                //     oRouter.navTo("RouteInterplantTransferDC", {
                //         sbu: _this.getView().getModel("ui").getData().sbu,
                //         dlvNo: sDlvNo
                //     }, true);
                // }
            },

            onCellClickOutDelHdr(oEvent) {
                var sDlvNo = oEvent.getParameters().rowBindingContext.getObject().DLVNO;
                this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);

                this.onCellClick(oEvent);

                this.getOutDelDtl();

                // Clear Sort and Filter
                this.clearSortFilter("outDelDtlTab");
            },

            onSaveTableLayout: function (oEvent) {
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                var oColumns = oTable.getColumns();
                var sSBU = _this.getView().getModel("ui").getData().sbu;

                var oParam = {
                    "SBU": sSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                _aTableProp.forEach(item => {
                    if (item.tblModel == oTable.getBindingInfo("rows").model) {
                        oParam['TYPE'] = item.modCode;
                        oParam['TABNAME'] = item.tblSrc;
                    }
                });

                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('px','')
                    });

                    ctr++;
                });

                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        MessageBox.information(_oCaption.INFO_LAYOUT_SAVE);
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });                
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "OUTERPACK"});
                oDDTextParam.push({CODE: "DLVNO"});
                oDDTextParam.push({CODE: "PONO"});
                oDDTextParam.push({CODE: "MATTYPE"});
                oDDTextParam.push({CODE: "IONO"});

                // Label
                oDDTextParam.push({CODE: "ITEM(S)"});

                // Buttons
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "CLOSE"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                oDDTextParam.push({CODE: "INFO_PROCEED_CLOSE"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                
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
        })
     });