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
	'sap/m/SearchField',
    "sap/ui/export/Spreadsheet",
    "../js/Common",
    'jquery.sap.global', 
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField, Spreadsheet, Common, jQuery) {
        "use strict";

        var _this;
        var _startUpInfo;
        var _oCaption = {};
        var _aRelCd = [];

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });

        return Controller.extend("zuiporel.controller.Main", {
            onInit: function () {
                _this = this;

                var oModelStartUp= new sap.ui.model.json.JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                });

                this._oTableFilters = {};
                this._sTableSortKey = "";
                this._sTableSortOrder = "";

                this.initializeComponent();

                this._oSortDialog = null;
                this._oFilterDialog = null;
                this._oViewSettingsDialog = {};

                this._aEntitySet = {
                    poRel: "POReleaseSet"
                };

                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};
                
                this._oDataBeforeChange = {};
                this._aInvalidValueState = [];

                this._aPOResultData = [];
            },

            onExit() {

            },
            
            initializeComponent() {
                this.showLoadingDialog("Loading...");

                // Get Captions
                this.getCaption();

                // Get Release Group
                this.getRelGrp();

                // Get Release Code
                this.getRelCd();

                // Get Columns
                this.getColumns();

                // Add header search field
                var oSmartFilter = this.getView().byId("sfbPORel");
                if (oSmartFilter) {
                    oSmartFilter.attachFilterChange(function(oEvent) {});

                    oSmartFilter.addEventDelegate({
                        onclick: function(oEvent) {
                            _this.handleSFButtonClick(oEvent)
                        }
                    })
                }

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PORELFILTER_CDS");
                console.log("ZVB_3DERP_PORELFILTER_CDS", oModel)
                oSmartFilter.setModel(oModel);

                this._tableRendered = "";
            },

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                } 
            },

            handleSFButtonClick(oEvent) {
                var oVBox = _this.getView().byId("vbMain");
                if (oEvent.srcControl.mProperties.text && oEvent.srcControl.mProperties.text.toUpperCase() == "SHOW FILTER BAR") {
                    oVBox.setHeight("70%");
                } else if (oEvent.srcControl.mProperties.text && oEvent.srcControl.mProperties.text.toUpperCase() == "HIDE FILTER BAR") {
                    oVBox.setHeight("85%");
                }
            },

            onColumnClick: function(oID, oName) {
                $('#' + oID).click(function(oEvent) { //Attach Table Header Element Event
                    
                    var oTarget = oEvent.currentTarget; //Get hold of Header Element
                    var oIndex = -1; //Get the column Index

                    _this.getView().byId("poRelTab").getColumns().forEach((col, idx) => {
                        if (col.getHeader().getText() === oTarget.innerText) oIndex = idx;
                    })

                    var oItems = _this.getView().byId("poRelTab").getItems();
                    var oCells = oItems[0].getCells();
                    _this.columnKey = oCells[oIndex].mBindingInfos.text.parts[0].path;
                    _this.vColumnIndex = oIndex;

                    if (_this._oTableFilters[_this.columnKey] !== undefined) {
                        sap.ui.getCore().byId("colFilter").setValue(_this._oTableFilters[_this.columnKey]);
                    }
                    else {
                        sap.ui.getCore().byId("colFilter").setValue("");
                    }

                    //set sort button color
                    if (_this._sTableSortKey === _this.columnKey) {
                        if (_this._sTableSortOrder === "Ascending") {
                            sap.ui.getCore().byId("colSortAscButton").addStyleClass("activeColSorting");
                            sap.ui.getCore().byId("colSortDescButton").removeStyleClass("activeColSorting");
                        }
                        else if (_this._sTableSortOrder === "Descending") {
                            sap.ui.getCore().byId("colSortAscButton").removeStyleClass("activeColSorting");
                            sap.ui.getCore().byId("colSortDescButton").addStyleClass("activeColSorting")
                        }
                    }
                    else {
                        sap.ui.getCore().byId("colSortAscButton").removeStyleClass("activeColSorting");
                        sap.ui.getCore().byId("colSortDescButton").removeStyleClass("activeColSorting");
                    }                   

                    //open column options dialog
                    _this._colDialog.openBy(oTarget);
                });  
            },

            onColumnSortAscending: function() {
                var oTable = this.byId("poRelTab"),
                oBinding = oTable.getBinding("items"),
                sPath,
                aSorters = [];

                sPath = this.columnKey;
                aSorters.push(new Sorter(sPath, false));
                oBinding.sort(aSorters);

                this._sTableSortKey = this.columnKey;
                this._sTableSortOrder = "Ascending";

                oTable.getColumns().forEach(col => col.setProperty("sortIndicator", "None"));
                oTable.getColumns()[this.vColumnIndex].setProperty("sortIndicator", this._sTableSortOrder);
                this._colDialog.close();
            },

            onColumnSortDescending: function() {
                var oTable = this.byId("poRelTab"),
                oBinding = oTable.getBinding("items"),
                sPath,
                aSorters = [];

                sPath = this.columnKey;
                aSorters.push(new Sorter(sPath, true));
                oBinding.sort(aSorters);

                this._sTableSortKey = this.columnKey;
                this._sTableSortOrder = "Descending";
                oTable.getColumns().forEach(col => col.setProperty("sortIndicator", "None"));
                oTable.getColumns()[this.vColumnIndex].setProperty("sortIndicator", this._sTableSortOrder);
                this._colDialog.close();
            },

            onColumnFilter: function(oEvent) {
                this._oTableFilters[this.columnKey] = oEvent.getParameter("value");
                var sQuery = oEvent.getParameter("value");
                var oBinding = this.getView().byId("poRelTab").getBinding("items");

                var aFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter(this.columnKey, sap.ui.model.FilterOperator.Contains, sQuery)
                    ]
                });

                if (sQuery === "") {
                    oBinding.filter("");
                }
                else {
                    oBinding.filter(aFilter);
                }
            },

            onOpenColOptions: function(oEvent) {
                var oPopover = sap.ui.getCore().byId(oEvent.getParameter("id"));
                var oPopoverContent = oPopover.getContent()[0];
                var oInputFilter = oPopoverContent.getContent()[2];
                oInputFilter.focus();
            },

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuiporel", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "PORELMOD", "ZDV_POREL");
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                // this.oJSONModel = new JSONModel();
                var vSBU = "VER"; //this.getView().getModel("ui").getData().activeSbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // console.log(oModel)
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        // _this.getView().setModel(oJSONColumnsModel, "columns"); //set the view model

                        if (oData.results.length > 0) {
                            // console.log(modCode)
                            if (modCode === 'PORELMOD') {
                                var aColumns = _this.setTableColumns(oColumns["poRel"], oData.results);                               
                                _this._aColumns["poRel"] = aColumns["columns"];
                                _this._aSortableColumns["poRel"] = aColumns["sortableColumns"];
                                _this._aFilterableColumns["poRel"] = aColumns["filterableColumns"]; 
                                _this.addColumns(_this.byId("poRelTab"), aColumns["columns"], "poRel");

                                // Add Column List Item
                                _this.setRowReadMode("poRel");
                                
                                // Get Data
                                _this.getPORel([], "");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;
                
                var aSortableColumns = [];
                var aFilterableColumns = [];
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

                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder, 
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName, 
                                label: vName, 
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

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

                // aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("sort", 
                //     new JSONModel({
                //         items: aSortableColumns,
                //         rowCount: aSortableColumns.length,
                //         activeRow: 0,
                //         table: ""
                //     })
                // );

                // aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("filter", 
                //     new JSONModel({
                //         items: aFilterableColumns,
                //         rowCount: aFilterableColumns.length,
                //         table: ""
                //     })
                // );

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // var aColumnProp = aColumns.filter(item => item.showable === true);

                // this.createViewSettingsDialog("column", 
                //     new JSONModel({
                //         items: aColumnProp,
                //         rowCount: aColumnProp.length,
                //         table: ""
                //     })
                // );

                
                return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
            },

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.m.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            // sortProperty: col.name,
                            // filterProperty: col.name,
                            // label: new sap.m.Text({text: col.label}),
                            //header: new sap.m.Label({text: "{" + model + ">" + col.name + "}"}),
                            header: new sap.m.Label({text: col.label}),
                            visible: col.visible,
                            demandPopin: true,
                            minScreenWidth: "Desktop"
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.m.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            // sortProperty: col.name,
                            // filterProperty: col.name,
                            // label: new sap.m.Text({text: col.label}),
                            // template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            header: new sap.m.Label({text: col.label}),
                            visible: col.visible,
                            demandPopin: true,
                            minScreenWidth: "Desktop"
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.m.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            // sortProperty: col.name,
                            // filterProperty: col.name,                            
                            // label: new sap.m.Text({text: col.label}),
                            // template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            header: new sap.m.Label({text: col.label}),
                            visible: col.visible,
                            demandPopin: true,
                            minScreenWidth: "Desktop"
                        }));
                    }
                })
            },

            getRelGrp() {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PORELFILTER_CDS");
                oModel.read('/ZVB_3DERP_PORELGRP', {
                    success: function (data, response) {
                        //console.log("POReleaseGrp", data);
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "relGrp");
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            getRelCd() {
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PORELFILTER_CDS");
                oModel.read('/ZVB_3DERP_PORELCD', {
                    success: function (data, response) {
                        //console.log("POReleaseCd", data);
                        _aRelCd = data.results;
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onSelectionChangeRelGrp(oEvent) {
                //console.log("onSelectionChangeRelGrp");
                var sSelectedKey = this.getView().byId("cmbRelGrp").getSelectedKey();
                var oRelCd = {results: []};
                _aRelCd.forEach(item => {
                    if (item.RELGRP == sSelectedKey) {
                        oRelCd.results.push({
                            RELCD: item.RELCD,
                            DESCRIPTION: item.DESCRIPTION
                        });

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(oRelCd);
                        _this.getView().setModel(oJSONModel, "relCd");
                    }
                })
            },

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aFilters = this.getView().byId("sfbPORel").getFilters();
                var sFilterGlobal = "";
                if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                this.getPORel(aFilters, sFilterGlobal);

                this.byId("btnReleaseSave").setEnabled(true);
                this.byId("btnCancelReleaseSave").setEnabled(true);
                this.byId("btnRejectSave").setEnabled(true);
                this.byId("btnPrintPreview").setEnabled(true);
                this.byId("btnExport").setEnabled(true);
                this.byId("btnRefresh").setEnabled(true);
            },

            getPORel(pFilters, pFilterGlobal) {
                //console.log("getPORel", pFilters, pFilterGlobal)
                
                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/POReleaseSet', {
                    success: function (data, response) {
                        console.log("POReleaseSet", data)
                        if (data.results.length > 0) {
                            data.results.sort(function(a,b) {
                                return new Date(b.PODATE) - new Date(a.PODATE);
                            });

                            data.results.forEach(item => {
                                if (item.PODATE !== null)
                                    item.PODATE = dateFormat.format(item.PODATE);
                            })

                            var aFilterTab = [];
                            // if (_this.getView().byId("poRelTab").getBinding("rows")) {
                            //     aFilterTab = _this.getView().byId("poRelTab").getBinding("rows").aFilters;
                            // }
                            
                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "poRel");
                            _this._tableRendered = "poRelTab";

                            _this.onFilterBySmart(pFilters, pFilterGlobal, aFilterTab);
                        }

                        var oTable = _this.getView().byId("poRelTab");
                        var oBinding = oTable.getBinding("items");
                        _this.getView().byId("poRelTab").getColumns().forEach((col, idx) => {
                            if (col.sId.replace("poRelCol", "") === _this._sTableSortKey) { 
                                console.log("sort", _this._sTableSortKey, _this._sTableSortOrder)
                                var sPath, aSorters = [], bSort;
                                sPath = _this._sTableSortKey;
                                bSort = (_this._sTableSortOrder == "Ascending" ? false : true);
                                aSorters.push(new Sorter(sPath, bSort));
                                oBinding.sort(aSorters);
                                
                                oTable.getColumns().forEach(col => col.setProperty("sortIndicator", "None"));
                                oTable.getColumns()[idx].setProperty("sortIndicator", _this._sTableSortOrder);
                            }
                        })

                        //_this.onColumnSortAscending();
                        // var oTable = _this.getView().byId("poRelTab");
                        // oTable.getColumns().forEach((col, idx) => {   
                        //     if (col._oSorter) {
                        //         oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                        //     }
                        // });
                        
                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })

                // Set Sort and Filter to table columns
                if (!this._colDialog) {
                    this._colDialog = sap.ui.xmlfragment("zuiporel.view.fragments.ColumnDialog", this);
                    // this._oResponsivePopover.setModel(this.getView().getModel());
                }

                var oTable = _this.getView().byId("poRelTab");
                oTable.addEventDelegate({
                    onAfterRendering: function(oEvent) {

                        //var oHeader = this.$().find('.sapMListTblHeaderCell'); //Get hold of table header elements
                        var oHeader = document.getElementsByClassName('sapMListTblHeaderCell');
                        //console.log("onAfterRendering2", oHeader)
                        for (var i = 0; i < oHeader.length; i++) {
                            var oID = oHeader[i].id;
                            var oName = oHeader[i].textContent;
                            _this.onColumnClick(oID, oName);
                        }
                        
                        //_this.onAfterTableRendering(oEvent);
                    }
                });

                //this.byId("poRelTab").addEventDelegate(oTableEventDelegate);
            },

            onFilterBySmart(pFilters, pFilterGlobal, pFilterTab) {
                var oFilter = null;
                var aFilter = [];
                var aFilter2 = [];
                var aFilterGrp = [];
                var aFilterCol = [];

                if (pFilters.length > 0) {
                    pFilters[0].aFilters.forEach((x, iIdx) => {
                        if (Object.keys(x).includes("aFilters")) {
                            x.aFilters.forEach(y => {
                                var sName = this._aColumns["poRel"].filter(item => item.name.toUpperCase() == y.sPath.toUpperCase())[0].name;
                                aFilter.push(new Filter(sName, FilterOperator.Contains, y.oValue1));

                                //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                            });
                            var oFilterGrp = new Filter(aFilter, false);
                            aFilterGrp.push(oFilterGrp);
                            aFilter = [];
                        } else if ([...new Set(pFilters[0].aFilters.map((item) => item.sPath))].length == 1) {
                            aFilter2.push(new Filter(x.sPath, FilterOperator.Contains, x.oValue1));
                            if (iIdx == pFilters[0].aFilters.length - 1) {
                                var oFilterGrp = new Filter(aFilter2, false);
                                aFilterGrp.push(oFilterGrp);
                                aFilter2 = [];
                            }
                        } else {
                            var sName = this._aColumns["poRel"].filter(item => item.name.toUpperCase() == x.sPath.toUpperCase())[0].name;
                            aFilter.push(new Filter(sName, FilterOperator.Contains, x.oValue1));
                            var oFilterGrp = new Filter(aFilter, false);
                            aFilterGrp.push(oFilterGrp);
                            aFilter = [];

                            //if (!aFilterCol.includes(sName)) aFilterCol.push(sName);
                        }
                    });
                }

                if (pFilterGlobal) {
                    this._aFilterableColumns["poRel"].forEach(item => {
                        var sDataType = this._aColumns["poRel"].filter(col => col.name === item.name)[0].type;
                        if (sDataType === "Edm.Boolean") aFilter.push(new Filter(item.name, FilterOperator.EQ, pFilterGlobal));
                        else aFilter.push(new Filter(item.name, FilterOperator.Contains, pFilterGlobal));
                    })

                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }

                // Release Group Custom
                var sSelectedKeyRelGrp = this.getView().byId("cmbRelGrp").getSelectedKey();
                if (sSelectedKeyRelGrp) {
                    aFilter.push(new Filter("RELGRP", FilterOperator.Contains, sSelectedKeyRelGrp));
                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }
                
                // Release Code Custom
                var sSelectedKeyRelCd = this.getView().byId("cmbRelCd").getSelectedKey();
                if (sSelectedKeyRelCd) {
                    aFilter.push(new Filter("RELCD", FilterOperator.Contains, sSelectedKeyRelCd));
                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }

                if (Object.keys(_this._oTableFilters).length > 0) {
                    var sColumnKey = Object.keys(_this._oTableFilters)[0];
                    aFilter.push(new Filter(sColumnKey, FilterOperator.Contains, _this._oTableFilters[sColumnKey]));
                    var oFilterGrp = new Filter(aFilter, false);
                    aFilterGrp.push(oFilterGrp);
                    aFilter = [];
                }

                oFilter = new Filter(aFilterGrp, true);

                this.byId("poRelTab").getBinding("items").filter(oFilter);

                
                // if (pFilterTab.length > 0) {
                //     pFilterTab.forEach(item => {
                //         var iColIdx = _this._aColumns["poRel"].findIndex(x => x.name == item.sPath);
                //         _this.getView().byId("poRelTab").filter(_this.getView().byId("poRelTab").getColumns()[iColIdx], 
                //             item.oValue1);
                //     });
                // }
            },

            onRelease(pType) {
                _this.showLoadingDialog("Executing...");
                var oTable = this.byId("poRelTab");
                var aSelRows = oTable.getSelectedItems();

                if (aSelRows.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    _this.closeLoadingDialog();
                    return;
                }

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                var aPOItem = [];

                var aData = this.getView().getModel("poRel").getData().results;
                //var aIndices = oTable.getBinding("rows").aIndices;

                aSelRows.forEach((e, i) => {
                    var oRow = e.getBindingContext("poRel").getObject();
                    if ((pType == "CANCEL" || pType == "REJECT") && oRow.WITHGR != "X") {
                        aPOItem.push({
                            "Pono": oRow.PONO
                        })
                    } else if (pType == "RELEASE") {
                        aPOItem.push({
                            "Pono": oRow.PONO,
                            "RelCode": oRow.RELCD
                        })
                    }
                })

                if (aPOItem.length === 0) {
                    MessageBox.information(_oCaption.INFO_SEL_PO_WITHGR);
                    _this.closeLoadingDialog();
                    return;
                }

                _this.onUnlock(aPOItem, pType);

                // temporary disabled to continue
//                 var aParamLockPO = [];
//                 aPOItem.forEach(item => {
//                     aParamLockPO.push({
//                         Pono: item.Pono
//                     })
//                 });

//                 var oParam = {
//                     "N_LOCK_PO_ITEMTAB": aParamLockPO,
//                     "iv_count": 300, 
//                     "N_LOCK_PO_ENQ": [], 
//                     "N_LOCK_PO_OUTMESSAGES": [] 
//                 }

//                 console.log("Lock_POHdr_Set param", oParam)
//                 oModel.create("/Lock_POHdr_Set", oParam, {
//                     method: "POST",
//                     success: function(data, oResponse) {
//                         console.log("Lock_POHdr_Set", data);

//                         if (data.N_LOCK_PO_OUTMESSAGES.results.filter(x => x.Type != "S").length == 0) {
//                             // Unlock first before release, reset, change PO to not encounter error
//                             _this.onUnlock(aPOItem, pType);

//                             // if (pType == "RELEASE") {
//                             //     _this.onRelSave(aPOItem);
//                             // } else if (pType == "CANCEL") {
//                             //     _this.onCancelRelSave(aPOItem);
//                             // } else if (pType == "REJECT") {
//                             //     _this.onRejectSave(aPOItem);
//                             // }
//                         } else {
//                             var oFilter = data.N_LOCK_PO_OUTMESSAGES.results.filter(x => x.Type != "S")[0];
//                             MessageBox.warning(oFilter.Message);
//                             _this.closeLoadingDialog();
//                         }
                        
//                     },
//                     error: function(err) {
//                         console.log("err", err)
//                         MessageBox.error(err);
//                         _this.closeLoadingDialog();
//                     }
//                 });
            },

            onRelSave(pPOList) {
                var aPOItem = [];
                pPOList.forEach(item => {
                    aPOItem.push({
                        Purchaseorder: item.Pono,
                        PoRelCode: item.RelCode,
                        UseExceptions: "X",
                        NoCommit: ""
                    });
                })

                var oParam = {
                    "N_POREL_IMPTAB": aPOItem,
                    "N_POREL_RETTAB": []
                }

                console.log("PO_ReleaseSet Param", oParam)

                var oModel = _this.getOwnerComponent().getModel();
                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                oModelRFC.create("/PO_ReleaseSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        console.log("PO_ReleaseSet", data);
                        //_this.onUnlock(pPOList);
                        _this.closeLoadingDialog();
                        _this._aPOResultData = data.N_POREL_RETTAB.results;
                        _this.showPOResultDialog();

                        _this._aPOResultData.forEach(item => {
                            if (item.RelIndicatorNew == "1") {
                                var param = {
                                    EBELN: item.Purchaseorder
                                };

                                oModel.create("/POReleaseTblSet", param, {
                                    method: "POST",
                                    success: function(data, oResponse) {
                                        console.log("POReleaseTblSet create", data);
                                    },
                                    error: function(err) {
                                        console.log("error", err);
                                    }
                                });
                            }
                        })  
                    },
                    error: function(err) {
                        //_this.onUnlock(pPOList);
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            onCancelRelSave(pPOList) {
                var aPOItem = [];
                pPOList.forEach(item => {
                    aPOItem.push({
                        Purchaseorder: item.Pono,
                        PoRelCode: "00",
                        UseExceptions: "X"
                    });
                })

                var oParam = {
                    "N_PORETRELEASE_IMPTAB": aPOItem,
                    "N_PORETRELEASE_RETTAB": []
                }

                console.log("PO_ResetReleaseSet Param", oParam)
                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                oModel.create("/PO_ResetReleaseSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        console.log("PO_ResetReleaseSet", data);
                        //_this.onUnlock(pPOList);
                        _this.closeLoadingDialog();
                        _this._aPOResultData = data.N_PORETRELEASE_RETTAB.results;
                        _this.showPOResultDialog();
                        
                    },
                    error: function(err) {
                        //_this.onUnlock(pPOList);
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            onRejectSave(pPOList) {
                var oModel = _this.getOwnerComponent().getModel();
                var oModelRfc = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var sMessage = "";

                pPOList.forEach((item, idxPO) => {
                    oModel.read("/POItemSet", {
                        urlParameters: {
                            "$filter": "PONO eq '" + item.Pono + "'"
                        },
                        success: function (data, response) {
                            console.log("POItemSet", data);
                            var aPOItem = []
                            data.results.forEach(poItem => {
                                aPOItem.push({
                                    Bedat: sapDateFormat.format(new Date(poItem.PODATE)) + "T00:00:00",
                                    Bsart: poItem.DOCTYPE,
                                    Banfn: poItem.PRNO,
                                    Bnfpo: poItem.PRITEM,
                                    Ebeln: poItem.PONO,
                                    Ebelp: poItem.POITEM,
                                    Bukrs: poItem.CURRENCY,
                                    Werks: poItem.PURCHPLANT,
                                    Unsez: poItem.SHIPTOPLANT,
                                    Menge: poItem.QTY,
                                    Meins: poItem.UOM,
                                    Netpr: poItem.NETPRICE,
                                    Peinh: poItem.PER,
                                    Bprme: poItem.ORDERPRICEUNIT,
                                    Repos: poItem.IRIND,
                                    Webre: poItem.GRBASEDIV,
                                    Eindt: sapDateFormat.format(new Date(poItem.DELDT)) + "T00:00:00",
                                    Uebto: poItem.OVERDELTOL,
                                    Untto: poItem.UNDERDELTOL,
                                    Uebtk: poItem.UNLIMITED,
                                    DeleteRec: true
                                })
                            })

                            var oParam = {
                                IPoNumber: item.Pono,
                                IDoDownload: "N",
                                IChangeonlyHdrplants: "N",
                                N_ChangePOAddtlDtlsParam: [],
                                N_ChangePOClosePRParam: [],
                                N_ChangePOCondHdrParam: [],
                                N_ChangePOCondParam: [],
                                N_ChangePOHdrTextParam: [],
                                N_ChangePOItemParam: aPOItem,
                                N_ChangePOItemSchedParam: [],
                                N_ChangePOItemTextParam: [],
                                N_ChangePOReturn: []
                            }

                            setTimeout(() => {
                                console.log("ChangePOSet Param", oParam);
                                oModelRfc.create("/ChangePOSet", oParam, {
                                    method: "POST",
                                    success: function(data, oResponse) {
                                        console.log("ChangePOSet", data);
                                        if (data.N_ChangePOReturn.results.length > 0) {
                                            sMessage += data.N_ChangePOReturn.results[0].Msgv1 + "\n";
                                            console.log("sMessage", sMessage)
                                        }
                                        
                                        if (idxPO == (pPOList.length - 1)) {
                                            //_this.onUnlock(pPOList);
                                            _this.closeLoadingDialog();
                                            MessageBox.information(sMessage);
                                            _this.onRefresh();
                                        }
                                    },
                                    error: function(err) {
                                        if (idxPO == (pPOList.length - 1)) {
                                            //_this.onUnlock(pPOList);
                                            MessageBox.error(err);
                                            _this.closeLoadingDialog();
                                        }
                                    }
                                });
                            }, 100);
                        },
                        error: function (err) {
                            _this.closeLoadingDialog();
                        }
                    })
                })
            },

            onUnlock(pPOList, pType) {
                // temporary disabled to proceed
                if (pType == "RELEASE") {
                    _this.onRelSave(pPOList);
                } else if (pType == "CANCEL") {
                    _this.onCancelRelSave(pPOList);
                } else if (pType == "REJECT") {
                    _this.onRejectSave(pPOList);
                }

                _this.closeLoadingDialog();

//                 var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");

//                 var aParamUnLockPO = [];
//                 pPOList.forEach(item => {
//                     aParamUnLockPO.push({
//                         Pono: item.Pono
//                     })
//                 });
//                 var oParam = {
//                     "N_UNLOCK_PO_ITEMTAB": aParamUnLockPO,
//                     "N_UNLOCK_PO_ENQ": [], 
//                     "N_UNLOCK_PO_MESSAGES": [] 
//                 }

//                 oModel.create("/Unlock_POHdr_Set", oParam, {
//                     method: "POST",
//                     success: function(data, oResponse) {
//                         console.log("Unlock_POHdr_Set", data)
//                         if (pType == "RELEASE") {
//                             _this.onRelSave(pPOList);
//                         } else if (pType == "CANCEL") {
//                             _this.onCancelRelSave(pPOList);
//                         } else if (pType == "REJECT") {
//                             _this.onRejectSave(pPOList);
//                         }

//                         //_this.closeLoadingDialog();
//                     },
//                     error: function(err) {
//                         MessageBox.error(err);
//                         _this.closeLoadingDialog();
//                     }
//                 });
            },

            onRefresh() {
                this.onSearch();
            },

            showPOResultDialog() {
                if (!this._POResultDialog) {
                    this._POResultDialog = sap.ui.xmlfragment("zuiporel.view.fragments.POResultDialog", this);

                    this._POResultDialog.setModel(
                        new JSONModel({
                            items: this._aPOResultData,
                            rowCount: this._aPOResultData.length
                        })
                    )

                    this.getView().addDependent(this._POResultDialog);
                }
                else {
                    this._POResultDialog.getModel().setProperty("/items", this._aPOResultData);
                    this._POResultDialog.getModel().setProperty("/rowCount", this._aPOResultData.length);
                }

                this._POResultDialog.setTitle("PO Release Result")
                this._POResultDialog.open();
            },

            onPOResultDialogClose: function(oEvent) {
                this._POResultDialog.close();
                _this.onRefresh();
            },

            setRowReadMode(arg) {
                var oColumnListItem = this.getView().byId("cliPORel");

                this._aColumns[arg].forEach((col, idx) => {
                    var oCell = new sap.m.Text({
                        text: "{" + arg + ">" + col.name + "}",
                        wrapping: false,
                        tooltip: "{" + arg + ">" + col.name + "}"
                    })

                    oColumnListItem.addCell(oCell);
                });            
            },
            
            getConnector(args) {
                var oConnector;

                switch (args) {
                    case "EQ":
                        oConnector = sap.ui.model.FilterOperator.EQ
                        break;
                      case "Contains":
                        oConnector = sap.ui.model.FilterOperator.Contains
                        break;
                      default:
                        // code block
                        break;
                }

                return oConnector;
            },

            showLoadingDialog(arg) {
                if (!_this._LoadingDialog) {
                    _this._LoadingDialog = sap.ui.xmlfragment("zuiporel.view.fragments.LoadingDialog", _this);
                    _this.getView().addDependent(_this._LoadingDialog);
                } 
                
                _this._LoadingDialog.setTitle(arg);
                _this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                _this._LoadingDialog.close();
            },

            onPrintPreview() {
                var oTable = this.byId("poRelTab");
                var aSelRows = oTable.getSelectedItems();

                if (aSelRows.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_SELECTED);
                    return;
                }

                aSelRows.forEach((e, i) => {
                    var oRow = e.getBindingContext("poRel").getObject();
                    var aPOItem = [];
                    aPOItem.push({
                        "PONo": oRow.PONO
                    });

                    var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                    var hashUrl = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                            target: {
                                semanticObject: "ZSO_POPRINT_PRVW",
                                action: "display"
                                    },
                                params : aPOItem[0]
                            }));
                    oCrossAppNavigator.toExternal({target: {shellHash: hashUrl}});

                })
            },

            onExport(pModel) {
                console.log("onExport", pModel)
                var oTable = _this.getView().byId(pModel + "Tab");
                var aCols = [], aRows = [], oSettings, oSheet;
                var aParent, aChild;
                var fileName;

                var sFileName = "";
                if (pModel == "poRel") {
                    var columns = oTable.getColumns();
                    console.log("export columns", columns, _this._aColumns, oTable.getItems())
                    for (var i = 0; i < columns.length; i++) {
                        aCols.push({
                            // label: columns[i].mProperties.filterProperty,
                            // property: columns[i].mProperties.filterProperty,
                            label: columns[i].sId.replace("poRelCol", ""),
                            property: columns[i].sId.replace("poRelCol", ""),
                            type: 'string'
                        })
                    }

                    sFileName = "PO Release";

                    //var aData = _this.getView().getModel(pModel).getData().results;
                    var aItems = this.byId("poRelTab").getItems();
                    aItems.forEach(item => {
                        aRows.push(_this.getView().getModel(pModel).getProperty(item.oBindingContexts[pModel].sPath));
                    });
                } else if (pModel == "poResult") {
                    aCols.push({
                        label: "Purchaseorder",
                        property: "Purchaseorder",
                        type: "string"
                    });

                    aCols.push({
                        label: "Message",
                        property: "Message",
                        type: "string"
                    });

                    aCols.push({
                        label: "RelStatusNew",
                        property: "RelStatusNew",
                        type: "string"
                    });

                    aCols.push({
                        label: "RelIndicatorNew",
                        property: "RelIndicatorNew",
                        type: "string"
                    });

                    sFileName = "PO Result";
                    aRows = _this._aPOResultData;
                }
                console.log("aRows", aRows)
                var date = new Date();
                fileName = sFileName + " " + date.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" });

                oSettings = {
                    fileName: fileName,
                    workbook: { columns: aCols },
                    dataSource: aRows
                };

                oSheet = new Spreadsheet(oSettings);
                oSheet.build()
                    .then(function () {
                        MessageToast.show('Spreadsheet export has finished');
                    })
                    .finally(function () {
                        oSheet.destroy();
                    });
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "RELCD"});
                oDDTextParam.push({CODE: "RELGRP"});
                oDDTextParam.push({CODE: "DOCTYPE"});
                oDDTextParam.push({CODE: "PURCHORG"});
                oDDTextParam.push({CODE: "PURCHGRP"});
                oDDTextParam.push({CODE: "VENDOR"});
                oDDTextParam.push({CODE: "RELIND"});
                oDDTextParam.push({CODE: "PONO"});

                // Label
                oDDTextParam.push({CODE: "ROWS"});

                // Button
                oDDTextParam.push({CODE: "RELSAVE"});
                oDDTextParam.push({CODE: "CRELSAVE"});
                oDDTextParam.push({CODE: "REJSAVE"});
                oDDTextParam.push({CODE: "PRTPREV"});
                oDDTextParam.push({CODE: "EXPORTTOEXCEL"});
                oDDTextParam.push({CODE: "REFRESH"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "INFO_SEL_PO_WITHGR"});
                
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
