sap.ui.define([
    "sap/ui/core/mvc/Controller",
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
     function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;
        var _oCaption = {};

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
        var sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"});

        return Controller.extend("zuioutdel.controller.DeliveryItem", {
            onInit: function () {
                _this = this;
                _this.showLoadingDialog("Loading...");

                this._aColumns = {};
                this.getCaption();
                this.getColumns();

                var oModel = _this.getOwnerComponent().getModel("ZVB_3DERP_OUTDELHUFILTER_CDS");
                var oSmartFilter = _this.getView().byId("sfbDlvItem");
                oSmartFilter.setModel(oModel);
                console.log("initializeComponent",oModel)
                
                // Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteDeliveryItem").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                this.getView().setModel(new JSONModel({
                    activeSbu: oEvent.getParameter("arguments").sbu,
                    activeDlvNo: oEvent.getParameter("arguments").dlvNo,
                    activeIssPlant: oEvent.getParameter("arguments").issPlant,
                    activeRcvPlant: oEvent.getParameter("arguments").rcvPlant,
                }), "ui");

                _this.initializeComponent();
            },

            initializeComponent() {
                _this.byId("btnAdd").setEnabled(false);
                _this.byId("btnCancel").setEnabled(false);

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

                this.closeLoadingDialog();
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

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                }
            },

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuioutdel", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "OUTDELDLVITEMMOD", "ZDV_OUTDELDLVHU");
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                var oJSONColumnsModel = new JSONModel();
                var vSBU = this.getView().getModel("ui").getData().activeSbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);

                        if (oData.results.length > 0) {
                            if (modCode === 'OUTDELDLVITEMMOD') {
                                var aColumns = _this.setTableColumns(oColumns["dlvItem"], oData.results);                          
                                _this._aColumns["dlvItem"] = aColumns["columns"];
                                _this.addColumns(_this.byId("dlvItemTab"), aColumns["columns"], "dlvItem");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = (arg1 ? arg1 : []);
                var oMetadata = arg2;
                
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Creatable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'px',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                return { columns: aColumns };
            },

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aFilters = this.getView().byId("sfbDlvItem").getFilters();
                var sFilterGlobal = "";
                if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                this.getDlvItem(aFilters, sFilterGlobal);

                this.byId("btnAdd").setEnabled(true);
                this.byId("btnCancel").setEnabled(true);
            },

            getDlvItem(pFilters, pFilterGlobal) {
                var oModel = this.getOwnerComponent().getModel();
                var oTable = _this.getView().byId("dlvItemTab");
                var sIssPlant = _this.getView().getModel("ui").getData().activeIssPlant;
                var sRcvPlant = _this.getView().getModel("ui").getData().activeRcvPlant;
                var sDirectionCd = "IN";
                var sDlvAsgnd = "";

                var sFilter = "PLANT eq '" + sIssPlant + "' and SHIPTOPLANT eq '" + sRcvPlant + 
                    "' and DIRECTIONCD eq '" + sDirectionCd + "' and DLVASGND eq '" + sDlvAsgnd + "'"
                //console.log("getDlvItem", sFilter)
                oModel.read('/DlvDetailHUSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvDetailHUSet", data)

                        var aFilterTab = [];
                        if (oTable.getBinding("rows")) {
                            aFilterTab = oTable.getBinding("rows").aFilters;
                        }

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvItem");
                        _this._tableRendered = "dlvItemTab";

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

            onAdd() {
                var oTable = this.byId("dlvItemTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                // this._router.navTo("RouteInterplantTransferDC", {
                //     sbu: _this.getView().getModel("ui").getData().activeSbu,
                //     dlvNo: _this.getView().getModel("ui").getData().activeDlvNo
                // }, true);
            },

            onEditOutDelHdr() {
                if (this.getView().getModel("ui").getData().activeDlvNo) {
                    var sDlvNo = this.getView().getModel("ui").getData().activeDlvNo;
                    this._router.navTo("RouteInterplantTransferDC", {
                        sbu: _this.getView().getModel("ui").getData().activeSbu,
                        dlvNo: sDlvNo
                    }, true);
                } else {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                }
            },

            onCellClickOutDelHdr(oEvent) {
                var sDlvNo = oEvent.getParameters().rowBindingContext.getObject().DLVNO;
                this.getView().getModel("ui").setProperty("/activeDlvNo", sDlvNo);

                this.onCellClick(oEvent);

                this.getOutDelDtl();

                // Clear Sort and Filter
                this.clearSortFilter("outDelDtlTab");
            },

            clearSortFilter(pTable) {
                var oTable = this.byId(pTable);
                var oColumns = oTable.getColumns();
                for (var i = 0, l = oColumns.length; i < l; i++) {

                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                        // oColumns[i].setFilterValue("");;
                        // oColumns[i].setFiltered(false);
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            onFilterBySmart(pModel, pFilters, pFilterGlobal, pFilterTab) {
                var oFilter = null;
                var aFilter = [];
                var aFilterGrp = [];
                var aFilterCol = [];

                if (pFilters.length > 0 && pFilters[0].aFilters) {
                    pFilters[0].aFilters.forEach(x => {
                        if (Object.keys(x).includes("aFilters")) {
                            x.aFilters.forEach(y => {
                                var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                                aFilter.push(new Filter(sName, FilterOperator.Contains, y.oValue1));

                                //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                            });
                            var oFilterGrp = new Filter(aFilter, false);
                            aFilterGrp.push(oFilterGrp);
                            aFilter = [];
                        } else {
                            var sName = this._aColumns[pModel].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.Contains, x.oValue1));
                            var oFilterGrp = new Filter(aFilter, false);
                            aFilterGrp.push(oFilterGrp);
                            aFilter = [];

                            //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                        }
                    });
                } /*else {
                    var sName = pFilters[0].sPath;
                    aFilter.push(new Filter(sName, FilterOperator.EQ,  pFilters[0].oValue1));
                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }*/

                if (pFilterGlobal) {
                    this._aColumns[pModel].forEach(item => {
                        var sDataType = this._aColumns[pModel].filter(col => col.name === item.name)[0].type;
                        if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, pFilterGlobal));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, pFilterGlobal));
                    })

                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }

                oFilter = new Filter(aFilterGrp, true);

                this.byId(pModel + "Tab").getBinding("rows").filter(oFilter, "Application");

                if (pFilterTab.length > 0) {
                    pFilterTab.forEach(item => {
                        var iColIdx = _this._aColumns[pModel].findIndex(x => x.name == item.sPath);
                        _this.getView().byId(pModel + "Tab").filter(_this.getView().byId(pModel + "Tab").getColumns()[iColIdx], 
                            item.oValue1);
                    });
                }
            },

            showLoadingDialog(arg) {
                if (!_this._LoadingDialog) {
                    _this._LoadingDialog = sap.ui.xmlfragment("zuioutdel.view.fragments.LoadingDialog", _this);
                    _this.getView().addDependent(_this._LoadingDialog);
                } 
                
                _this._LoadingDialog.setTitle(arg);
                _this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                _this._LoadingDialog.close();
            },

            formatTime(pTime) {
                var time = pTime.split(':');
                let now = new Date();
                return (new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time)).toLocaleTimeString();
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("dlvItemTab") >= 0) {
                    sModel = "dlvItem";
                }

                setTimeout(() => {
                    var oData = oTable.getModel(sModel).getData().results;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("dlvItemTab") >= 0) {
                    sModel = "dlvItem";
                }

                this.setActiveRowHighlight(sModel);
            },

            setActiveRowHighlight(arg) {
                var oTable = this.byId(arg + "Tab");

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                    oTable.getRows().forEach((row, idx) => {
                        if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else {
                            row.removeStyleClass("activeRow");
                        }
                    })
                }, 2);
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("dlvItemTab") >= 0) {
                        sModel = "dlvItem";
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
                oDDTextParam.push({CODE: "OUTERPACK"});
                oDDTextParam.push({CODE: "DLVNO"});
                oDDTextParam.push({CODE: "PONO"});
                oDDTextParam.push({CODE: "MATTYPE"});
                oDDTextParam.push({CODE: "IONO"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                // oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                // oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                // oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                // oDDTextParam.push({CODE: "INFO_CREATE_DATA_NOT_ALLOW"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
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
        })
     });