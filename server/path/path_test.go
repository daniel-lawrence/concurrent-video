package path_test

import (
	"server/path"
	"testing"
)

func TestPathMatching(t *testing.T) {
	_, err := path.NewAPIPath("")
	if err == nil {
		t.Error("Expected error")
	}

	_, err = path.NewAPIPath("GET/")
	if err != nil {
		t.Error(err)
	}

	apiPath, err := path.NewAPIPath("GET/test/one/two")
	if err != nil {
		t.Error(err)
	}

	_, match := apiPath.Match("GET", "/test/one/two")
	if !match {
		t.Error("match should have been true")
	}

	_, match = apiPath.Match("GET", "/some/thing/else")
	if match {
		t.Error("match should have been false")
	}

	_, match = apiPath.Match("GET", "/")
	if match {
		t.Error("match should have been false")
	}

	_, match = apiPath.Match("GET", "")
	if match {
		t.Error("match should have been false")
	}

	_, match = apiPath.Match("POST", "/test/one/two")
	if match {
		t.Error("match should have been false")
	}
}

func TestPathVariables(t *testing.T) {
	apiPath, err := path.NewAPIPath("POST/test/{foo}/user/{uid}")
	if err != nil {
		t.Error(err)
	}

	pathVars, match := apiPath.Match("POST", "test/x/user/y")
	if !match {
		t.Error("match should have been true")
	}

	if pathVars["foo"] != "x" {
		t.Errorf("Incorrect path var %s", pathVars["foo"])
	}
}
