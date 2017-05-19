function commonItemInArrays (array1, array2) {
    if (!array1 || !array2) {
        return null;
    }

    var commonItem = null;
    $.each(array1, function (index, value) {
        if ($.inArray(value, array2) !== -1) {
            commonItem = value;
            return false;
        }
    });
    return commonItem;
}

// Turn formatted projects field into an array of projects
function parseProjects (projects) {
    if (!projects) {
        return [];
    }
    return projects.split(', ');
}
